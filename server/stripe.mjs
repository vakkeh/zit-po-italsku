// Stripe REST API bez SDK: formulářové kódování parametrů a ověření podpisu webhooku.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.mjs';

// {a:{b:[{c:1}]}} → a[b][0][c]=1, jak Stripe očekává.
export function formEncode(value, prefix = '', params = new URLSearchParams()) {
  if (value === undefined || value === null) return params;
  if (typeof value === 'object') for (const [key, inner] of Object.entries(value)) formEncode(inner, prefix ? `${prefix}[${key}]` : key, params);
  else params.append(prefix, String(value));
  return params;
}

export async function stripeApi(secretKey, path, body, fetchImpl = fetch) {
  if (!secretKey) throw new HttpError('Chybí STRIPE_SECRET_KEY.', 500);
  const response = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${secretKey}`, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: body ? formEncode(body).toString() : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(`Stripe ${response.status}: ${data.error?.message || 'neznámá chyba'}`, response.status);
  return data;
}

// Hlavička Stripe-Signature: t=<čas>,v1=<hmac>[,v1=…]; podepisuje se "<t>.<tělo>".
export function verifyStripeSignature(payload, header, secret, toleranceSeconds = 300, now = Date.now()) {
  if (!secret) throw new HttpError('Chybí STRIPE_WEBHOOK_SECRET.', 500);
  const parts = String(header || '').split(',').map(part => part.split('='));
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, sig]) => sig);
  if (!Number.isFinite(timestamp) || !signatures.length) throw new HttpError('Neplatný podpis webhooku.', 400);
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) throw new HttpError('Webhook je příliš starý.', 400);
  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex'));
  if (!signatures.some(sig => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), expected))) throw new HttpError('Neplatný podpis webhooku.', 400);
  return JSON.parse(payload);
}
