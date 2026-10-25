// Volitelné vystavení faktury ve Fakturoidu klientky (API v3, Client Credentials).
// Dokumentace: https://www.fakturoid.cz/api/v3
import { HttpError } from './http.mjs';

const BASE = 'https://app.fakturoid.cz/api/v3';
let cachedToken = null;

export function fakturoidClient(env, fetchImpl = fetch) {
  const { FAKTUROID_SLUG: slug, FAKTUROID_CLIENT_ID: id, FAKTUROID_CLIENT_SECRET: secret, FAKTUROID_CONTACT_EMAIL: email } = env;
  if (!slug || !id || !secret || !email) throw new HttpError('Fakturoid není nastavený (FAKTUROID_SLUG, FAKTUROID_CLIENT_ID, FAKTUROID_CLIENT_SECRET, FAKTUROID_CONTACT_EMAIL).', 500);
  const userAgent = `ZitPoItalsku (${email})`;
  async function token() {
    if (cachedToken?.id === id && cachedToken.expires > Date.now()) return cachedToken.value;
    const response = await fetchImpl(`${BASE}/oauth/token`, { method: 'POST', headers: { 'user-agent': userAgent, accept: 'application/json', 'content-type': 'application/json', authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` }, body: JSON.stringify({ grant_type: 'client_credentials' }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new HttpError(`Fakturoid přihlášení ${response.status}`, response.status);
    cachedToken = { id, value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.value;
  }
  return async function call(path, body) {
    const response = await fetchImpl(`${BASE}/accounts/${slug}/${path}`, { method: 'POST', headers: { 'user-agent': userAgent, accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
    const text = await response.text();
    if (!response.ok) throw new HttpError(`Fakturoid ${path} ${response.status}: ${text.slice(0, 300)}`, response.status);
    return text ? JSON.parse(text) : {};
  };
}

// Kniha a doprava jako položky; zaplaceno kartou, faktura se rovnou označí jako uhrazená a odešle e-mailem.
export async function createInvoice(call, order) {
  const subject = await call('subjects.json', { name: order.customer.name || order.customer.email, email: order.customer.email, phone: order.customer.phone || undefined, street: order.customer.street || undefined, city: order.customer.city || undefined, zip: order.customer.zip || undefined, country: order.customer.country || undefined });
  const invoice = await call('invoices.json', { subject_id: subject.id, custom_id: order.number, payment_method: 'card', currency: 'CZK', language: 'cz', lines: order.lines.map(line => ({ name: line.name, quantity: line.quantity, unit_name: line.unitName, unit_price: line.unitPrice })) });
  return invoice;
}
export async function settleAndSendInvoice(call, invoiceId, paidOn, email) {
  try { await call(`invoices/${invoiceId}/payments.json`, { paid_on: paidOn, send_thank_you_email: false }); }
  catch (error) { if (error.status !== 403) throw error; } // 403 = už je uhrazená (opakovaný webhook)
  await call(`invoices/${invoiceId}/message.json`, { email });
}
