import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import config from '../config.mjs';
import { formEncode, verifyStripeSignature } from '../server/stripe.mjs';
import { packetXml, parsePacketResponse, splitName, validatePoint } from '../server/packeta.mjs';
import { checkoutParams, handleCheckout, handleStripeWebhook, orderNumber } from '../server/orders.mjs';

const cfg = structuredClone(config);
cfg.product = { ...cfg.product, checkoutMode: 'stripe', price: 449, availability: 'skladem' };
cfg.shipping = { ...cfg.shipping, price: 89, packetaWidgetKey: 'abcdef0123456789' };
const sign = (payload, secret, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

test('Stripe parametry se kódují jako vnořený formulář', () => {
  assert.equal(decodeURIComponent(formEncode({ a: { b: [{ c: 1 }] }, d: 'x', e: undefined }).toString()), 'a[b][0][c]=1&d=x');
});

test('podpis webhooku: platný projde, změněný nebo starý ne', () => {
  const payload = '{"type":"x"}', secret = 'whsec_test';
  assert.deepEqual(verifyStripeSignature(payload, sign(payload, secret), secret), { type: 'x' });
  assert.throws(() => verifyStripeSignature(payload + ' ', sign(payload, secret), secret), /podpis/);
  assert.throws(() => verifyStripeSignature(payload, sign(payload, 'whsec_jiny'), secret), /podpis/);
  assert.throws(() => verifyStripeSignature(payload, sign(payload, secret, 1000), secret), /starý/);
});

test('výdejní místa Zásilkovny i externích dopravců, jména a XML', () => {
  assert.deepEqual(validatePoint({ id: '79', label: 'Praha' }), { addressId: '79', carrierPickupPoint: '', label: 'Praha' });
  assert.deepEqual(validatePoint({ id: 'X1', carrierId: '3060', carrierPickupPointId: 'X1' }), { addressId: '3060', carrierPickupPoint: 'X1', label: '' });
  for (const bad of [null, {}, { id: '79<x>' }, { carrierId: 'a', carrierPickupPointId: 'b' }]) assert.equal(validatePoint(bad), null);
  assert.deepEqual(splitName('Jana Marie Nováková'), { name: 'Jana Marie', surname: 'Nováková' });
  assert.deepEqual(splitName('Cher'), { name: 'Cher', surname: 'Cher' });
  const body = packetXml('heslo&', { number: 'ZPI1', name: 'A<b', phone: null, carrierPickupPoint: '' });
  assert.equal(body, '<createPacket><apiPassword>heslo&amp;</apiPassword><packetAttributes><number>ZPI1</number><name>A&lt;b</name></packetAttributes></createPacket>');
  assert.match(orderNumber(), /^ZPI\d{10}[0-9A-Z]{4}$/);
});

test('odpověď Zásilkovny: kód zásilky nebo srozumitelná chyba', () => {
  assert.deepEqual(parsePacketResponse('<response><status>ok</status><result><id>1234567890</id><barcode>Z1234567890</barcode><barcodeText>Z 123 4567 890</barcodeText></result></response>'), { id: '1234567890', barcode: 'Z1234567890', barcodeText: 'Z 123 4567 890' });
  assert.throws(() => parsePacketResponse('<response><status>fault</status><fault>PacketAttributesFault</fault><string>Invalid attributes</string><detail><attributes><fault><name>addressId</name><fault>Unknown branch</fault></fault></attributes></detail></response>'), error => error.status === 422 && /Invalid attributes.*addressId Unknown branch/.test(error.message));
  assert.throws(() => parsePacketResponse('Bad gateway', 503), error => error.retryable);
});

test('pokladna: cena ze serveru, ne z prohlížeče; faktura podle nastavení', () => {
  const params = checkoutParams({ quantity: 2, price: 1, point: { id: '79', label: 'Z-BOX Praha' } }, { baseUrl: 'https://kniha.example', number: 'ZPI1', cfg });
  assert.equal(params.line_items[0].price_data.unit_amount, 44900);
  assert.equal(params.line_items[0].quantity, 2);
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount, 8900);
  assert.equal(params.metadata.packeta_address_id, '79');
  assert.equal(params.success_url, 'https://kniha.example/dekujeme.html');
  assert.equal(params.invoice_creation.enabled, true);
  assert.equal(checkoutParams({ quantity: 1, point: { id: '79' } }, { baseUrl: 'https://k.example', number: 'ZPI1', cfg, env: { INVOICE_PROVIDER: 'fakturoid' } }).invoice_creation, undefined);
  for (const input of [{ quantity: 0, point: { id: '79' } }, { quantity: 6, point: { id: '79' } }, { quantity: 1.5, point: { id: '79' } }, { quantity: 1 }])
    assert.throws(() => checkoutParams(input, { baseUrl: 'https://k.example', number: 'ZPI1', cfg }), error => error.status === 400);
  assert.throws(() => checkoutParams({ quantity: 1, point: { id: '79' } }, { baseUrl: 'https://k.example', number: 'ZPI1', cfg: { ...cfg, product: { ...cfg.product, availability: 'pripravujeme' } } }), /není spuštěný/);
});

test('pokladna bez spuštěného prodeje odmítne požadavek bez volání Stripe', async () => {
  const response = await handleCheckout(new Request('https://k.example/api/checkout', { method: 'POST', body: JSON.stringify({ quantity: 1, point: { id: '79' } }) }), {}, () => assert.fail('Stripe se nemá volat'));
  assert.equal(response.status, 400);
});

// Simulovaný Stripe + Zásilkovna + Fakturoid; zaznamenává volání.
function fakeServices({ metadata = {}, packetaBody } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body });
    if (url.startsWith('https://api.stripe.com/v1/payment_intents/')) {
      if (init.method === 'POST') { for (const [k, v] of new URLSearchParams(init.body)) metadata[k.slice(9, -1)] = v; }
      return Response.json({ id: 'pi_1', metadata });
    }
    if (url === 'https://www.zasilkovna.cz/api/rest') return new Response(packetaBody ?? '<response><status>ok</status><result><id>1234567890</id><barcode>Z1234567890</barcode><barcodeText>Z 123 4567 890</barcodeText></result></response>');
    if (url.endsWith('/oauth/token')) return Response.json({ access_token: 'tok', expires_in: 7200 });
    if (url.endsWith('/subjects.json')) return Response.json({ id: 11 }, { status: 201 });
    if (url.endsWith('/invoices.json')) return Response.json({ id: 22, number: '2026-0001' }, { status: 201 });
    if (url.endsWith('/payments.json')) return Response.json({ id: 33 }, { status: 201 });
    if (url.endsWith('/message.json')) return new Response(null, { status: 204 });
    throw new Error('neočekávané volání ' + url);
  };
  return { calls, metadata, fetchImpl };
}
const session = { id: 'cs_1', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 98700, amount_subtotal: 89800, created: 1767225600, shipping_cost: { amount_total: 8900 }, metadata: { order_number: 'ZPI1', quantity: '2', packeta_address_id: '79', packeta_carrier_point: '' }, customer_details: { name: 'Jana Nováková', email: 'jana@example.cz', phone: '+420777123456', address: { line1: 'Ulice 1', city: 'Praha', postal_code: '11000', country: 'CZ' } } };
const webhook = (event, secret = 'whsec_test') => { const body = JSON.stringify(event); return new Request('https://k.example/api/stripe-webhook', { method: 'POST', body, headers: { 'stripe-signature': sign(body, secret) } }); };
const env = { STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', PACKETA_API_PASSWORD: 'pw' };

test('po zaplacení vznikne zásilka a kód se uloží k platbě; opakovaný webhook nic nezdvojí', async () => {
  const services = fakeServices();
  const event = { type: 'checkout.session.completed', data: { object: session } };
  const response = await handleStripeWebhook(webhook(event), env, services.fetchImpl);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).packeta, 'Z1234567890');
  const packet = services.calls.find(c => c.url.includes('zasilkovna')).body;
  for (const part of ['<number>ZPI1</number>', '<name>Jana</name>', '<surname>Nováková</surname>', '<addressId>79</addressId>', '<value>987.00</value>', '<weight>0.80</weight>', '<phone>+420777123456</phone>']) assert.ok(packet.includes(part), part);
  assert.equal(services.metadata.packeta_barcode, 'Z1234567890');
  const again = await handleStripeWebhook(webhook(event), env, services.fetchImpl);
  assert.equal(again.status, 200);
  assert.equal(services.calls.filter(c => c.url.includes('zasilkovna')).length, 1);
});

test('chybné údaje u Zásilkovny se uloží k platbě, výpadek se nechá zopakovat', async () => {
  const fault = fakeServices({ packetaBody: '<response><status>fault</status><string>Invalid</string></response>' });
  const response = await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object: session } }), env, fault.fetchImpl);
  assert.equal(response.status, 200);
  assert.match(fault.metadata.packeta_error, /Invalid/);
  const outage = fakeServices({ packetaBody: '' });
  const original = outage.fetchImpl;
  outage.fetchImpl = async (url, init) => url.includes('zasilkovna') ? new Response('', { status: 503 }) : original(url, init);
  assert.equal((await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object: session } }), env, outage.fetchImpl)).status, 500);
});

test('Fakturoid: faktura s knihou a dopravou, uhrazená a odeslaná zákaznici', async () => {
  const services = fakeServices();
  const fEnv = { ...env, INVOICE_PROVIDER: 'fakturoid', FAKTUROID_SLUG: 'klientka', FAKTUROID_CLIENT_ID: 'id', FAKTUROID_CLIENT_SECRET: 'secret', FAKTUROID_CONTACT_EMAIL: 'web@example.cz' };
  const response = await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object: session } }), fEnv, services.fetchImpl);
  assert.equal(response.status, 200);
  const invoice = JSON.parse(services.calls.find(c => c.url.endsWith('/invoices.json')).body);
  assert.equal(invoice.custom_id, 'ZPI1');
  assert.deepEqual(invoice.lines.map(l => [l.quantity, l.unit_price]), [[2, '449.00'], [1, '89.00']]);
  assert.equal(JSON.parse(services.calls.find(c => c.url.endsWith('/payments.json')).body).paid_on, '2026-01-01');
  assert.equal(JSON.parse(services.calls.find(c => c.url.endsWith('/message.json')).body).email, 'jana@example.cz');
  assert.equal(services.metadata.fakturoid_sent, '1');
  await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object: session } }), fEnv, services.fetchImpl);
  assert.equal(services.calls.filter(c => c.url.endsWith('/invoices.json')).length, 1);
});

test('webhook odmítne neplatný podpis a ignoruje cizí nebo nezaplacené platby', async () => {
  const services = fakeServices();
  assert.equal((await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object: session } }, 'whsec_jiny'), env, services.fetchImpl)).status, 400);
  for (const object of [{ ...session, metadata: {} }, { ...session, payment_status: 'unpaid' }])
    assert.equal((await handleStripeWebhook(webhook({ type: 'checkout.session.completed', data: { object } }), env, services.fetchImpl)).status, 200);
  assert.equal(services.calls.length, 0);
});
