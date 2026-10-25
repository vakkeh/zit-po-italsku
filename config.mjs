// UPRAVUJTE ZDE. Po změně spusťte: npm run build
// Texty stránky jsou v src/index.html. Sem patří prodejní údaje, doprava a odkazy.
// Tajné klíče (Stripe, API heslo Zásilkovny, fakturační služba) sem nikdy nepatří:
// nastavují se v proměnných prostředí na Netlify, viz docs/PLATBY-A-ZASILKOVNA.md.

export default {
  product: {
    name: 'Žít po italsku',
    subtitle: 'Umění zpomalit, cítit a opravdu žít',
    author: 'Linda Valešová',
    price: 399, // Kč včetně DPH. Ukázková cena, před spuštěním potvrďte.
    availability: 'pripravujeme', // pripravujeme | skladem | predprodej | vyprodano
    dispatchDays: 2, // skladem: do kolika pracovních dnů knihu odešleme
    dispatchDate: '', // predprodej: datum první expedice YYYY-MM-DD
    binding: 'Brožovaná',
    pages: 160,
    format: '135 × 210 mm',
    isbn: '',
  },
  // Doprava Zásilkovnou. packetaWidgetKey je veřejný 16znakový API klíč z klientské sekce Zásilkovny
  // (NE API heslo). price = cena dopravy v Kč, null = pokladna vypnutá. weightKg = hmotnost jednoho balení.
  shipping: { packetaWidgetKey: '', price: null, weightKg: 0.4, maxQuantity: 5 },
  siteUrl: 'https://janvales74-coder.github.io/zit-po-italsku-web', // Finální HTTPS adresa bez koncového lomítka (SEO a sdílení).
  projectUrl: '', // Objev Itálii
  contactEmail: '',
  // Prodávající: patička webu, právní dokumenty a patička faktur. invoiceNote např. 'Neplátce DPH.'
  seller: { name: '', ico: '', address: '', invoiceNote: '' },
};
