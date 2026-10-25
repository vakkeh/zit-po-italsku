// Sdílená pravidla prodeje pro sestavení webu, serverové funkce a testy.
const AVAILABILITY = ['pripravujeme', 'skladem', 'predprodej', 'vyprodano'];

// Kniha se smí prodávat: skladem nebo v předprodeji s datem expedice, s platnou cenou.
export function saleOpen(product) {
  if (!AVAILABILITY.includes(product.availability)) throw new Error('Neplatná dostupnost: ' + product.availability);
  if (!['skladem', 'predprodej'].includes(product.availability) || !Number.isFinite(product.price) || product.price <= 0) return false;
  return product.availability !== 'predprodej' || /^\d{4}-\d{2}-\d{2}$/.test(product.dispatchDate);
}

// Vlastní pokladna (Stripe + Zásilkovna) je aktivní jen s cenou, dopravou a klíčem widgetu.
export function stripeCheckoutReady({ product, shipping }) {
  return saleOpen(product) && Number.isFinite(shipping?.price) && shipping.price >= 0 && !!shipping.packetaWidgetKey && Number.isInteger(shipping.maxQuantity) && shipping.maxQuantity >= 1 && shipping.weightKg > 0;
}

// Krátký stav prodeje pro tlačítka a poznámky.
export function saleState(product, ready) {
  if (ready) return product.availability === 'predprodej'
    ? { label: 'Objednat předem', short: 'Předprodej, odesíláme od ' + czDate(product.dispatchDate) }
    : { label: 'Objednat knihu', short: `Odesíláme do ${product.dispatchDays} pracovních dnů` };
  if (product.availability === 'vyprodano') return { label: 'Momentálně vyprodáno', short: 'Kniha je momentálně vyprodaná' };
  return { label: 'Brzy v prodeji', short: 'Prodej spustíme brzy' };
}

export const czDate = iso => new Intl.DateTimeFormat('cs-CZ').format(new Date(iso + 'T12:00:00'));
export const czPrice = n => Number.isFinite(n) && n >= 0 ? new Intl.NumberFormat('cs-CZ').format(n) + ' Kč' : '';
