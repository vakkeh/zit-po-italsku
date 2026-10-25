import test from 'node:test';
import assert from 'node:assert/strict';
import { buyLink, saleState, czPrice } from '../commerce.mjs';
const LINK = 'https://buy.stripe.com/test_abc123';
const product = { price: 399, availability: 'skladem', dispatchDays: 2, dispatchDate: '' };

test('skladem s cenou a odkazem nabízí nákup přes Stripe', () => {
  assert.equal(buyLink(LINK, product), LINK);
  assert.equal(saleState(product, LINK).label, 'Objednat knihu');
});
test('bez odkazu, bez ceny, při přípravě a vyprodání se nákup nenabízí', () => {
  assert.equal(buyLink('', product), '');
  assert.equal(buyLink(LINK, { ...product, price: null }), '');
  for (const availability of ['pripravujeme', 'vyprodano']) assert.equal(buyLink(LINK, { ...product, availability }), '');
  assert.equal(saleState({ ...product, availability: 'vyprodano' }, '').label, 'Momentálně vyprodáno');
  assert.equal(saleState(product, '').label, 'Brzy v prodeji');
});
test('předprodej potřebuje datum expedice', () => {
  const pre = { ...product, availability: 'predprodej' };
  assert.equal(buyLink(LINK, pre), '');
  assert.equal(buyLink(LINK, { ...pre, dispatchDate: '2026-12-01' }), LINK);
  assert.match(saleState({ ...pre, dispatchDate: '2026-12-01' }, LINK).short, /1\. 12\. 2026/);
});
test('platební odkaz musí být HTTPS a dostupnost platná', () => {
  assert.throws(() => buyLink('http://buy.stripe.com/x', product), /HTTPS/);
  assert.throws(() => buyLink(LINK, { ...product, availability: 'neco' }), /dostupnost/);
});
test('cena v korunách s pevnou mezerou', () => {
  assert.equal(czPrice(399), '399 Kč');
  assert.equal(czPrice(1290), '1 290 Kč');
  assert.equal(czPrice(null), '');
});
