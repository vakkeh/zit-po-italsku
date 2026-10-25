import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { config } from '../netlify/edge-functions/password.mjs';

const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const run = async (password, authorization) => {
  globalThis.Netlify = { env: { get: () => password } };
  const request = new Request('https://k.example/', { headers: authorization ? { authorization } : {} });
  return handler(request, { next: async () => new Response('stránka') });
};

test('bez nastaveného hesla zůstane web zamčený', async () => {
  assert.equal((await run(undefined, basic('a', 'x'))).status, 503);
  assert.equal((await run('', basic('a', ''))).status, 503);
});
test('bez hesla nebo se špatným heslem vrátí 401 s výzvou', async () => {
  for (const auth of [undefined, basic('a', 'spatne'), basic('a', 'tajne!'.slice(0, 3)), 'Basic ***', 'Bearer x', 'Basic ' + Buffer.from('bezdvojtecky').toString('base64')]) {
    const response = await run('tajne!', auth);
    assert.equal(response.status, 401);
    assert.ok(response.headers.get('www-authenticate').startsWith('Basic'));
  }
});
test('se správným heslem projde na stránku, uživatelské jméno je libovolné, heslo smí obsahovat dvojtečku', async () => {
  assert.equal(await (await run('tajne!', basic('kdokoli', 'tajne!'))).text(), 'stránka');
  assert.equal((await run('a:b', basic('', 'a:b'))).status, 200);
});
test('webhook Stripe je z ochrany vyloučený', () => {
  assert.deepEqual(config.excludedPath, ['/api/stripe-webhook']);
  assert.equal(config.path, '/*');
});
