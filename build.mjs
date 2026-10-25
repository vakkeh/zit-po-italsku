// Sestaví statický web do dist/: hlavní stránku ze šablony src/index.html a údajů z config.mjs.
import config, { STRIPE_PAYMENT_LINK } from './config.mjs';
import { buyLink, saleState, czDate, czPrice } from './commerce.mjs';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const { product: p } = config;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

for (const value of [STRIPE_PAYMENT_LINK, config.siteUrl, config.projectUrl]) if (value && new URL(value).protocol !== 'https:') throw new Error('Veřejné odkazy musí používat HTTPS: ' + value);
if (p.availability === 'predprodej' && !/^\d{4}-\d{2}-\d{2}$/.test(p.dispatchDate)) console.warn('Předprodej bez dispatchDate: nákup zůstane vypnutý.');

const link = buyLink(STRIPE_PAYMENT_LINK, p);
const state = saleState(p, link);
const price = czPrice(p.price);
const priceTag = price ? ` <span class="bp">${price}</span>` : '';
// Tlačítko nákupu: odkaz na Stripe, nebo neaktivní štítek se stavem prodeje.
const cta = (label, extra = '') => link
  ? `<a class="btn${extra}" href="${esc(link)}">${label}${priceTag}</a>`
  : `<span class="btn btn-off${extra}" aria-disabled="true">${esc(state.label)}${priceTag}</span>`;
const dispatchWord = ['', 'jednoho', 'dvou', 'tří', 'čtyř', 'pěti'][p.dispatchDays] ?? p.dispatchDays;

const offerNote = {
  skladem: `Odešleme ji do ${dispatchWord} pracovních dnů, takže stihne i&nbsp;Vánoce. Kdyby vám nesedla, do čtrnácti dnů ji můžete vrátit.`,
  predprodej: `Předprodej: knihy začneme odesílat ${p.dispatchDate ? czDate(p.dispatchDate) : 'brzy'}. Kdyby vám nesedla, do čtrnácti dnů od převzetí ji můžete vrátit.`,
  vyprodano: 'Kniha je momentálně vyprodaná. Dotisk připravujeme.',
  pripravujeme: 'Prodej spustíme brzy. Kniha bude k&nbsp;dostání právě tady.',
}[link ? p.availability : (p.availability === 'vyprodano' ? 'vyprodano' : 'pripravujeme')];
const faqDelivery = p.availability === 'predprodej' && p.dispatchDate
  ? `Knihy z předprodeje začneme odesílat ${czDate(p.dispatchDate)}. Po České republice bývá zásilka doma obvykle za 1–3 dny.`
  : `Odesíláme do ${dispatchWord} pracovních dnů. Po České republice bývá zásilka doma obvykle za 1–3 dny.`;

const schema = { '@context': 'https://schema.org', '@type': 'Book', name: p.name, alternativeHeadline: p.subtitle, author: { '@type': 'Person', name: p.author }, inLanguage: 'cs', bookFormat: 'https://schema.org/Paperback', numberOfPages: Number(p.pages) || undefined, ...(p.isbn ? { isbn: p.isbn } : {}), ...(config.siteUrl ? { url: config.siteUrl, image: config.siteUrl + '/assets/obalka.webp' } : {}) };
if (link) schema.offers = { '@type': 'Offer', price: p.price, priceCurrency: 'CZK', url: config.siteUrl || link, availability: p.availability === 'predprodej' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock', eligibleRegion: { '@type': 'Country', name: 'CZ' } };

const values = {
  siteUrl: esc(config.siteUrl),
  canonical: config.siteUrl ? `<link rel="canonical" href="${esc(config.siteUrl)}/">\n<meta property="og:url" content="${esc(config.siteUrl)}/">` : '',
  schema: JSON.stringify(schema).replace(/</g, '\\u003c'),
  price,
  priceBlock: price ? `<div class="price"><b>${price}</b><span>včetně DPH</span></div>` : '',
  specs: esc(`${p.binding} · ${p.pages} stran · ${p.format}`).replace(/ × /g, '&nbsp;×&nbsp;').replace(/ mm/g, '&nbsp;mm'),
  statusShort: esc(state.short),
  offerNote,
  faqDelivery,
  payNote: link ? 'Kartou, Apple Pay nebo Google Pay. Platbu bezpečně zpracuje Stripe.' : 'Platit půjde kartou, Apple Pay nebo Google Pay přes Stripe.',
  ctaHeader: link ? `<a class="btn" href="${esc(link)}">Koupit${priceTag}</a>` : `<a class="btn" href="#objednat">${p.availability === 'vyprodano' ? 'Vyprodáno' : 'Brzy v prodeji'}</a>`,
  ctaHero: cta(state.label),
  ctaHeroSea: cta(state.label, ' btn-light'),
  ctaOffer: cta(state.label),
  ctaOfferSea: cta(state.label, ' btn-light'),
  ctaDock: link ? `<a class="btn" href="${esc(link)}">Koupit</a>` : `<a class="btn" href="#objednat">Více</a>`,
  projectLink: config.projectUrl ? `    <a class="link" href="${esc(config.projectUrl)}">Projekt Objev Itálii</a>\n` : '',
  contactLink: config.contactEmail ? `<a href="mailto:${esc(config.contactEmail)}">Kontakt</a>` : '',
  sellerLine: config.seller.name ? `<p class="wrap seller">Prodávající: ${esc(config.seller.name)}, IČO ${esc(config.seller.ico)}, ${esc(config.seller.address)}</p>` : '',
  year: String(new Date().getFullYear()),
};

const fill = template => template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error('Šablona používá neznámou hodnotu {{' + key + '}}');
  return values[key];
});

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('assets', 'dist/assets', { recursive: true });
for (const file of ['styles.css', 'app.js']) cpSync(file, 'dist/' + file);
writeFileSync('dist/index.html', fill(readFileSync('src/index.html', 'utf8')));

// Děkovací stránka: nastavte ji ve Stripe jako adresu po úspěšné platbě (siteUrl + /dekujeme.html).
writeFileSync('dist/dekujeme.html', `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Děkujeme · Žít po italsku</title><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="styles.css"></head><body>
<main class="thanks"><h1>Děkujeme. Vaše italská chvíle je o&nbsp;stránku blíž.</h1><p>Potvrzení platby vám přijde e-mailem. Než kniha dorazí, zkuste si dát jednu kávu bez telefonu. Jen tak, pro sebe.</p><a class="btn" href="./">Zpět ke knize</a><div class="scene"><div class="book"><img src="assets/obalka.webp" width="512" height="800" alt="Obálka knihy Žít po italsku"></div></div></main>
</body></html>`);

// Právní dokumenty jsou zatím pracovní šablony; před spuštěním prodeje je nahraďte zkontrolovanými texty.
const legal={terms:['Obchodní podmínky','Prodávající: [JMÉNO / FIRMA], IČO: [IČO], sídlo: [ADRESA], kontakt: [E-MAIL, TELEFON].','Doplňte vznik smlouvy, ceny včetně DPH, způsoby platby, dopravu po ČR a termíny dodání podle skutečného nastavení Stripe Payment Link.','Doplňte poučení o odstoupení, reklamaci, mimosoudním řešení sporů u ČOI a účinnost podmínek.'],complaints:['Reklamační řád','Doplňte totožnost a kontakt prodávajícího a adresu pro uplatnění reklamace.','Popište práva z vadného plnění, postup uplatnění, doklady, náklady a zákonné lhůty vyřízení podle platných předpisů.'],withdrawal:['Odstoupení od smlouvy','Pro spotřebitelský nákup knihy na dálku uveďte poučení o zpravidla 14denní lhůtě od převzetí, postup vrácení a odpovědnost za snížení hodnoty.','Formulář: Adresát [PRODÁVAJÍCÍ, ADRESA, E-MAIL]. Oznamuji odstoupení od smlouvy na knihu [NÁZEV]. Objednávka [ČÍSLO], převzato [DATUM], jméno [JMÉNO], adresa [ADRESA], datum [DATUM], podpis při listinném podání [PODPIS].','Doplňte pravidla nákladů na vrácení a způsob i lhůtu vrácení plateb.'],privacy:['Ochrana osobních údajů','Správce: [JMÉNO / FIRMA], IČO [IČO], sídlo [ADRESA], kontakt [E-MAIL].','Pro newsletter popište e-mail a souhlas, účel zasílání novinek, dobu uchování [DOPLNIT], poskytovatele formuláře [DOPLNIT] a způsob odhlášení. Pro upozornění na naskladnění vymezte samostatný účel a dobu uchování.','Objednávkové a platební údaje zpracovává Stripe (Stripe Payments Europe, Ltd.). Doplňte zpracovatele, příjemce, případné předávání mimo EHP a samostatné právní tituly objednávek.','Uveďte práva na přístup, opravu, výmaz, omezení, přenositelnost, námitku a odvolání souhlasu podle použitelného titulu a právo stížnosti u ÚOOÚ. Popište hostingové logy a skutečně používané cookies.']};
writeFileSync('dist/legal.json', JSON.stringify(legal));
console.log(`Hotovo: dist/index.html (${link ? 'nákup přes Stripe zapnutý' : 'nákup vypnutý: ' + state.label}), dist/dekujeme.html, dist/legal.json.`);
