// Objednávka: Stripe Checkout → po zaplacení zásilka v Zásilkovně (+ případně faktura ve Fakturoidu).
// Cena vždy pochází z config.mjs, nikdy z prohlížeče. Výsledky se ukládají do metadat platby ve Stripe,
// takže opakovaný webhook nic nezaloží dvakrát a prodávající vidí kód zásilky přímo u platby.
import config from '../config.mjs';
import { stripeCheckoutReady } from '../commerce.mjs';
import { HttpError, isRetryable, json } from './http.mjs';
import { stripeApi, verifyStripeSignature } from './stripe.mjs';
import { createPacket, splitName, validatePoint } from './packeta.mjs';
import { createInvoice, fakturoidClient, settleAndSendInvoice } from './fakturoid.mjs';

const invoiceProvider = env => (env.INVOICE_PROVIDER || 'stripe').toLowerCase();
const pragueDate = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(date);

// Max. 36 alfanumerických znaků (limit Zásilkovny pro číslo objednávky).
export function orderNumber(now = new Date(), random = Math.random) {
  const stamp = pragueDate(now).replace(/-/g, '').slice(2) + new Intl.DateTimeFormat('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).replace(':', '');
  return `ZPI${stamp}${Math.floor(random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0')}`;
}

export function checkoutParams(input, { baseUrl, number, env = {}, cfg = config }) {
  const { product, shipping, seller } = cfg;
  if (!stripeCheckoutReady(cfg)) throw new HttpError('Prodej teď není spuštěný.', 400);
  const quantity = Number(input?.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > shipping.maxQuantity) throw new HttpError(`Počet kusů musí být 1 až ${shipping.maxQuantity}.`, 400);
  const point = validatePoint(input?.point);
  if (!point) throw new HttpError('Vyberte prosím výdejní místo Zásilkovny.', 400);
  const metadata = { order_number: number, quantity, packeta_address_id: point.addressId, packeta_carrier_point: point.carrierPickupPoint, pickup_point: point.label };
  const params = {
    mode: 'payment', locale: 'cs', client_reference_id: number,
    line_items: [{ quantity, price_data: { currency: 'czk', unit_amount: Math.round(product.price * 100), product_data: { name: `${product.name} – ${product.author}` } } }],
    shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', display_name: 'Zásilkovna – výdejní místo', fixed_amount: { amount: Math.round(shipping.price * 100), currency: 'czk' } } }],
    billing_address_collection: 'required', phone_number_collection: { enabled: true },
    custom_text: { submit: { message: `Doručení na výdejní místo: ${point.label || 'vybrané místo Zásilkovny'}` } },
    success_url: `${baseUrl}/dekujeme.html`, cancel_url: `${baseUrl}/#objednavka`,
    metadata, payment_intent_data: { metadata, description: `${product.name} × ${quantity} (${number})` },
  };
  if (invoiceProvider(env) === 'stripe') {
    const footer = [seller.name, seller.ico && `IČO: ${seller.ico}`, seller.address, seller.invoiceNote].filter(Boolean).join(', ');
    params.invoice_creation = { enabled: true, invoice_data: { description: `Objednávka ${number}`, metadata: { order_number: number }, ...(footer ? { footer } : {}) } };
  }
  return params;
}

export async function handleCheckout(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return json({ error: 'Použijte POST.' }, 405);
  let input;
  try { input = await request.json(); } catch { return json({ error: 'Neplatný požadavek.' }, 400); }
  try {
    const params = checkoutParams(input, { baseUrl: new URL(request.url).origin, number: orderNumber(), env });
    const session = await stripeApi(env.STRIPE_SECRET_KEY, 'checkout/sessions', params, fetchImpl);
    return json({ url: session.url });
  } catch (error) {
    if (error.status === 400) return json({ error: error.message }, 400);
    console.error('checkout', error);
    return json({ error: 'Platbu se teď nepodařilo zahájit. Zkuste to prosím za chvíli znovu.' }, 502);
  }
}

export async function fulfillSession(session, env, fetchImpl = fetch) {
  const meta = session.metadata || {};
  if (!meta.order_number) return { ignored: 'platba nepochází z této pokladny' };
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) return { ignored: `platba ve stavu ${session.payment_status}` };
  const stripe = (path, body) => stripeApi(env.STRIPE_SECRET_KEY, path, body, fetchImpl);
  const piPath = `payment_intents/${session.payment_intent}`;
  const done = (await stripe(piPath)).metadata || {};
  const save = async data => { Object.assign(done, data); await stripe(piPath, { metadata: data }); };
  const customer = session.customer_details || {};
  const quantity = Number(meta.quantity) || 1;
  const result = { order: meta.order_number, errors: [] };
  const attempt = async (label, step) => {
    try { await step(); }
    catch (error) {
      console.error(label, meta.order_number, error);
      result.errors.push(`${label}: ${error.message}`);
      if (isRetryable(error)) result.retry = true;
      else await save({ [`${label}_error`]: error.message.slice(0, 450) }).catch(() => { result.retry = true; });
    }
  };

  await attempt('packeta', async () => {
    if (done.packeta_barcode) return;
    const packet = await createPacket(env.PACKETA_API_PASSWORD, {
      number: meta.order_number, ...splitName(customer.name), email: customer.email, phone: customer.phone,
      addressId: meta.packeta_address_id, carrierPickupPoint: meta.packeta_carrier_point,
      value: (session.amount_total / 100).toFixed(2), currency: 'CZK', weight: (quantity * config.shipping.weightKg).toFixed(2), eshop: env.PACKETA_SENDER,
    }, fetchImpl);
    await save({ packeta_id: packet.id, packeta_barcode: packet.barcode, packeta_error: '' });
  });
  result.packeta = done.packeta_barcode;

  if (invoiceProvider(env) === 'fakturoid') await attempt('fakturoid', async () => {
    if (done.fakturoid_sent) return;
    const call = fakturoidClient(env, fetchImpl);
    if (!done.fakturoid_invoice_id) {
      const address = customer.address || {};
      const shippingTotal = (session.shipping_cost?.amount_total ?? 0) / 100;
      const invoice = await createInvoice(call, {
        number: meta.order_number,
        customer: { name: customer.name, email: customer.email, phone: customer.phone, street: [address.line1, address.line2].filter(Boolean).join(', '), city: address.city, zip: address.postal_code, country: address.country },
        lines: [
          { name: `${config.product.name} – ${config.product.author}`, quantity, unitName: 'ks', unitPrice: ((session.amount_subtotal ?? 0) / 100 / quantity).toFixed(2) },
          ...(shippingTotal > 0 ? [{ name: 'Doprava Zásilkovna', quantity: 1, unitName: 'ks', unitPrice: shippingTotal.toFixed(2) }] : []),
        ],
      });
      await save({ fakturoid_invoice_id: String(invoice.id), fakturoid_number: invoice.number || '' });
    }
    await settleAndSendInvoice(call, done.fakturoid_invoice_id, pragueDate(new Date((session.created || Date.now() / 1000) * 1000)), customer.email);
    await save({ fakturoid_sent: '1', fakturoid_error: '' });
  });
  return result;
}

export async function handleStripeWebhook(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') return json({ error: 'Použijte POST.' }, 405);
  const payload = await request.text();
  let event;
  try { event = verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return json({ error: error.message }, error.status || 400); }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return json({ ignored: event.type });
  try {
    const result = await fulfillSession(event.data.object, env, fetchImpl);
    // 500 = Stripe webhook zopakuje (až 3 dny); trvalé chyby zůstanou v metadatech platby.
    return json(result, result.retry ? 500 : 200);
  } catch (error) {
    console.error('webhook', error);
    return json({ error: error.message }, 500);
  }
}
