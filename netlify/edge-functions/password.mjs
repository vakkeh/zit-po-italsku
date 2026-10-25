// Celý web za heslem (HTTP Basic). Heslo je v Netlify → Environment variables → SITE_PASSWORD, uživatelské jméno je libovolné.
// Bez nastaveného SITE_PASSWORD web zůstane zamčený (503), nikdy ne otevřený. Webhook Stripe heslo mít nesmí.
// Zrušení hesla: smazat tento soubor a znovu nasadit.
const sha256 = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const sameText = async (a, b) => {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
};
const headers = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

export default async (request, context) => {
  const password = Netlify.env.get('SITE_PASSWORD');
  if (!password) return new Response('Web je zatím zamčený.', { status: 503, headers });
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    let given = '';
    try { given = atob(auth.slice(6)); } catch { /* neplatná hlavička = špatné heslo */ }
    const supplied = given.slice(given.indexOf(':') + 1);
    if (given.includes(':') && await sameText(supplied, password)) return context.next();
  }
  return new Response('Zadejte heslo.', { status: 401, headers: { ...headers, 'www-authenticate': 'Basic realm="Zit po italsku", charset="UTF-8"' } });
};

export const config = { path: '/*', excludedPath: ['/api/stripe-webhook'] };
