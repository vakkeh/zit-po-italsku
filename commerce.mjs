// Sdílená pravidla pro sestavení webu, serverové funkce a testy. UTM přepisujeme jednotně.
export function saleOpen(product) {
  if (!['skladem', 'predprodej'].includes(product.availability) || !Number.isFinite(product.price) || product.price <= 0) return false;
  return product.availability !== 'predprodej' || /^\d{4}-\d{2}-\d{2}$/.test(product.dispatchDate);
}
export function shopLink(productUrl, product, placement) {
  if (!productUrl || !saleOpen(product)) return '';
  const url = new URL(product.checkoutMode === 'cart' && product.verifiedCartUrl ? product.verifiedCartUrl : productUrl);
  if (url.protocol !== 'https:') throw new Error('E-shop musí mít HTTPS adresu.');
  for (const [key, val] of Object.entries({utm_source:'onepager',utm_medium:'web',utm_campaign:'zit-po-italsku',utm_content:placement})) url.searchParams.set(key, val);
  return url.href;
}
// Vlastní pokladna (Stripe + Zásilkovna) je aktivní jen s cenou, dopravou a klíčem widgetu.
export function stripeCheckoutReady({ product, shipping }) {
  return product.checkoutMode === 'stripe' && saleOpen(product) && Number.isFinite(shipping?.price) && shipping.price >= 0 && !!shipping.packetaWidgetKey && Number.isInteger(shipping.maxQuantity) && shipping.maxQuantity >= 1 && shipping.weightKg > 0;
}
