// Sestaví statický web do dist/: hlavní stránku ze šablony src/index.html a údajů z config.mjs.
import config from './config.mjs';
import { stripeCheckoutReady, saleState, czDate, czPrice } from './commerce.mjs';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';

const { product: p, shipping } = config;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

for (const value of [config.siteUrl, config.projectUrl]) if (value && new URL(value).protocol !== 'https:') throw new Error('Veřejné odkazy musí používat HTTPS: ' + value);
if (p.availability === 'predprodej' && !/^\d{4}-\d{2}-\d{2}$/.test(p.dispatchDate)) console.warn('Předprodej bez dispatchDate: nákup zůstane vypnutý.');

// Prodej běží přes vlastní pokladnu (Stripe + Zásilkovna). Všechna tlačítka vedou na objednávkový formulář.
const ready = stripeCheckoutReady(config);
const link = ready ? '#objednat' : '';
const state = saleState(p, ready);
const price = czPrice(p.price);
const priceTag = price ? ` <span class="bp">${price}</span>` : '';
// Tlačítko nákupu: odkaz na Stripe, nebo neaktivní štítek se stavem prodeje.
const cta = (label, extra = '') => link
  ? `<a class="btn${extra}" href="${esc(link)}">${label}${priceTag}</a>`
  : `<span class="btn btn-off${extra}" aria-disabled="true">${esc(state.label)}${priceTag}</span>`;
const orderForm = () => `<form id="order-form" class="order-form" data-packeta-key="${esc(shipping.packetaWidgetKey)}" data-price="${p.price}" data-shipping="${shipping.price}">
        <div class="of-row"><label for="order-quantity">Počet kusů</label><select id="order-quantity" name="quantity">${Array.from({ length: shipping.maxQuantity }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select></div>
        <div class="pickup"><p class="pickup-title">Zásilkovna na výdejní místo nebo do Z-BOXu</p><p class="pickup-selected" id="pickup-selected" aria-live="polite">Výdejní místo zatím není vybrané.</p><button type="button" class="pickup-button" id="pickup-button" data-change="Změnit výdejní místo">Vybrat výdejní místo</button></div>
        <p class="order-shipping">Doprava Zásilkovnou <span>${czPrice(shipping.price)}</span></p>
        <p class="order-total">Celkem k úhradě <strong id="order-total">${czPrice(p.price + shipping.price)}</strong></p>
        <label class="consent"><input name="terms" type="checkbox" required><span>Souhlasím s <button type="button" class="inline-link" data-legal="terms">obchodními podmínkami</button> a beru na vědomí <button type="button" class="inline-link" data-legal="privacy">informace o zpracování osobních údajů</button>.</span></label>
        <button class="btn" type="submit">${state.label === 'Objednat předem' ? 'Objednat předem a zaplatit' : 'Objednat a zaplatit'}</button>
        <p class="form-status" role="status"></p>
        <noscript><p class="form-status">Pro objednávku je potřeba mít v prohlížeči zapnutý JavaScript.</p></noscript>
      </form>`;
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
if (ready) schema.offers = { '@type': 'Offer', price: p.price, priceCurrency: 'CZK', url: config.siteUrl ? config.siteUrl + '/#objednat' : undefined, availability: p.availability === 'predprodej' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock', eligibleRegion: { '@type': 'Country', name: 'CZ' } };

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
  payNote: ready ? 'Platba na zabezpečené stránce Stripe, doprava Zásilkovnou po celé ČR.' : 'Platit půjde přes Stripe, knihu pošleme Zásilkovnou.',
  ctaHeader: link ? `<a class="btn" href="${esc(link)}">Koupit${priceTag}</a>` : `<a class="btn" href="#objednat">${p.availability === 'vyprodano' ? 'Vyprodáno' : 'Brzy v prodeji'}</a>`,
  ctaHero: cta(state.label),
  ctaHeroSea: cta(state.label, ' btn-light'),
  ctaOffer: ready ? orderForm() : cta(state.label),
  ctaOfferSea: ready ? '' : cta(state.label, ' btn-light'),
  ctaDock: `<a class="btn" href="#objednat">${ready ? 'Koupit' : 'Více'}</a>`,
  projectLink: config.projectUrl ? `    <a class="link" href="${esc(config.projectUrl)}">Projekt Objev Itálii</a>\n` : '',
  contactLink: config.contactEmail ? `<a href="mailto:${esc(config.contactEmail)}">Kontakt</a>` : '',
  sellerLine: config.seller.name ? `<p class="wrap seller">Prodávající: ${esc(config.seller.name)}, IČO ${esc(config.seller.ico)}, ${esc(config.seller.address)}</p>` : '',
  year: String(new Date().getFullYear()),
};

// Dočasná heslová brána: jen s SITE_PASSWORD. Do stránky jde otisk hesla, nikdy heslo samo.
const sitePassword = process.env.SITE_PASSWORD || '';
const gateTag = sitePassword ? '<meta name="robots" content="noindex"><script src="gate.js"></script>' : '';
values.gate = gateTag;

const fill = template => template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error('Šablona používá neznámou hodnotu {{' + key + '}}');
  return values[key];
});

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('assets', 'dist/assets', { recursive: true });
for (const file of ['styles.css', 'app.js']) cpSync(file, 'dist/' + file);
if (sitePassword) {
  const salt = 'zit-po-italsku', hash = pbkdf2Sync(sitePassword, salt, 100000, 32, 'sha256').toString('hex');
  writeFileSync('dist/gate.js', readFileSync('gate.js', 'utf8').replace('__SALT__', salt).replace('__HASH__', hash));
}
writeFileSync('dist/index.html', fill(readFileSync('src/index.html', 'utf8')));

// Děkovací stránka ze šablony src/dekujeme.html (sem Stripe vrací zákazníka po zaplacení, success_url v server/orders.mjs).
writeFileSync('dist/dekujeme.html', fill(readFileSync('src/dekujeme.html', 'utf8')));

// Právní dokumenty jsou zatím pracovní šablony; před spuštěním prodeje je nahraďte zkontrolovanými texty.
const legal={terms:['Obchodní podmínky','Prodávající: [JMÉNO / FIRMA], IČO: [IČO], sídlo: [ADRESA], kontakt: [E-MAIL, TELEFON].','Doplňte vznik smlouvy, ceny včetně DPH, způsoby platby, dopravu po ČR a termíny dodání podle skutečného nastavení pokladny (Stripe, Zásilkovna).','Doplňte poučení o odstoupení, reklamaci, mimosoudním řešení sporů u ČOI a účinnost podmínek.'],complaints:['Reklamační řád','Doplňte totožnost a kontakt prodávajícího a adresu pro uplatnění reklamace.','Popište práva z vadného plnění, postup uplatnění, doklady, náklady a zákonné lhůty vyřízení podle platných předpisů.'],withdrawal:['Odstoupení od smlouvy','Pro spotřebitelský nákup knihy na dálku uveďte poučení o zpravidla 14denní lhůtě od převzetí, postup vrácení a odpovědnost za snížení hodnoty.','Formulář: Adresát [PRODÁVAJÍCÍ, ADRESA, E-MAIL]. Oznamuji odstoupení od smlouvy na knihu [NÁZEV]. Objednávka [ČÍSLO], převzato [DATUM], jméno [JMÉNO], adresa [ADRESA], datum [DATUM], podpis při listinném podání [PODPIS].','Doplňte pravidla nákladů na vrácení a způsob i lhůtu vrácení plateb.'],privacy:['Ochrana osobních údajů','Správce: [JMÉNO / FIRMA], IČO [IČO], sídlo [ADRESA], kontakt [E-MAIL].','Pro newsletter popište e-mail a souhlas, účel zasílání novinek, dobu uchování [DOPLNIT], poskytovatele formuláře [DOPLNIT] a způsob odhlášení. Pro upozornění na naskladnění vymezte samostatný účel a dobu uchování.','Platební a fakturační údaje zpracovává Stripe (Stripe Payments Europe, Ltd.), doručovací údaje Zásilkovna; doplňte i fakturační službu, pokud ji používáte. Doplňte zpracovatele, příjemce, případné předávání mimo EHP a samostatné právní tituly objednávek.','Uveďte práva na přístup, opravu, výmaz, omezení, přenositelnost, námitku a odvolání souhlasu podle použitelného titulu a právo stížnosti u ÚOOÚ. Popište hostingové logy a skutečně používané cookies.']};
writeFileSync('dist/legal.json', JSON.stringify(legal));
console.log(`Hotovo: dist/index.html (${ready ? 'pokladna Stripe + Zásilkovna zapnutá' : 'nákup vypnutý: ' + state.label}), dist/dekujeme.html, dist/legal.json.`);
