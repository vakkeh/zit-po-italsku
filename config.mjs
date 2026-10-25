// UPRAVUJTE ZDE. Po změně spusťte: npm run build
// Texty stránky jsou v src/index.html. Sem patří jen prodejní údaje a odkazy.
// Do konfigurace nikdy nevkládejte API klíče ani jiné tajné údaje; jde o veřejný web.

// Odkaz na platbu ze Stripe (Payment Link), např. 'https://buy.stripe.com/…'.
// Prázdný = web nákup nenabízí a tlačítka ukazují „Brzy v prodeji“.
export const STRIPE_PAYMENT_LINK = '';

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
  siteUrl: 'https://janvales74-coder.github.io/zit-po-italsku-web', // Finální HTTPS adresa bez koncového lomítka (SEO a sdílení).
  projectUrl: '', // Objev Itálii
  contactEmail: '',
  seller: { name: '', ico: '', address: '' }, // Prodávající (patička, právní dokumenty)
};
