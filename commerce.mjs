// Sdílená pravidla prodeje pro sestavení webu a testy.
const AVAILABILITY = ['pripravujeme', 'skladem', 'predprodej', 'vyprodano'];

// Odkaz na platbu, jen když se kniha opravdu dá koupit. Jinak prázdný řetězec.
export function buyLink(paymentLink, product) {
  if (!AVAILABILITY.includes(product.availability)) throw new Error('Neplatná dostupnost: ' + product.availability);
  if (!paymentLink || !['skladem', 'predprodej'].includes(product.availability) || !(product.price > 0)) return '';
  if (product.availability === 'predprodej' && !/^\d{4}-\d{2}-\d{2}$/.test(product.dispatchDate)) return '';
  const url = new URL(paymentLink);
  if (url.protocol !== 'https:') throw new Error('Platební odkaz musí mít HTTPS adresu.');
  return url.href;
}

// Krátký stav prodeje pro tlačítka a poznámky.
export function saleState(product, link) {
  if (link) return product.availability === 'predprodej'
    ? { label: 'Objednat předem', short: 'Předprodej, odesíláme od ' + czDate(product.dispatchDate) }
    : { label: 'Objednat knihu', short: `Odesíláme do ${product.dispatchDays} pracovních dnů` };
  if (product.availability === 'vyprodano') return { label: 'Momentálně vyprodáno', short: 'Kniha je momentálně vyprodaná' };
  return { label: 'Brzy v prodeji', short: 'Prodej spustíme brzy' };
}

export const czDate = iso => new Intl.DateTimeFormat('cs-CZ').format(new Date(iso + 'T12:00:00'));
export const czPrice = n => Number.isFinite(n) && n > 0 ? new Intl.NumberFormat('cs-CZ').format(n) + ' Kč' : '';
