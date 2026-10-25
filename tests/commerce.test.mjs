import test from 'node:test';
import assert from 'node:assert/strict';
import { saleOpen, stripeCheckoutReady, saleState, czPrice } from '../commerce.mjs';
const product = { price: 399, availability: 'skladem', dispatchDays: 2, dispatchDate: '' };
const shipping = { packetaWidgetKey: 'abcdef0123456789', price: 89, weightKg: 0.4, maxQuantity: 5 };

test('pokladna je aktivní jen s cenou, dopravou a klíčem widgetu', () => {
  assert.ok(stripeCheckoutReady({ product, shipping }));
  assert.ok(!stripeCheckoutReady({ product, shipping: { ...shipping, price: null } }));
  assert.ok(!stripeCheckoutReady({ product, shipping: { ...shipping, packetaWidgetKey: '' } }));
  assert.ok(!stripeCheckoutReady({ product: { ...product, price: null }, shipping }));
});
test('při přípravě a vyprodání se neprodává, předprodej potřebuje datum', () => {
  for (const availability of ['pripravujeme', 'vyprodano']) assert.ok(!saleOpen({ ...product, availability }));
  assert.ok(!saleOpen({ ...product, availability: 'predprodej' }));
  assert.ok(saleOpen({ ...product, availability: 'predprodej', dispatchDate: '2026-12-01' }));
  assert.throws(() => saleOpen({ ...product, availability: 'neco' }), /dostupnost/);
});
test('stav prodeje pro tlačítka', () => {
  assert.equal(saleState(product, true).label, 'Objednat knihu');
  assert.match(saleState({ ...product, availability: 'predprodej', dispatchDate: '2026-12-01' }, true).short, /1\. 12\. 2026/);
  assert.equal(saleState({ ...product, availability: 'vyprodano' }, false).label, 'Momentálně vyprodáno');
  assert.equal(saleState(product, false).label, 'Brzy v prodeji');
});
test('cena v korunách s pevnou mezerou', () => {
  assert.equal(czPrice(399), '399 Kč');
  assert.equal(czPrice(1290), '1 290 Kč');
  assert.equal(czPrice(null), '');
});
