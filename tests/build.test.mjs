import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import config from '../config.mjs';

// Sestaví web v dočasné složce s upravenou konfigurací a vrátí vygenerované soubory.
function build(change, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'zit-build-'));
  try {
    for (const f of ['build.mjs', 'commerce.mjs', 'styles.css', 'app.js', 'gate.js']) cpSync(new URL('../' + f, import.meta.url), join(dir, f));
    for (const d of ['src', 'assets']) cpSync(new URL('../' + d, import.meta.url), join(dir, d), { recursive: true });
    const c = structuredClone(config); change?.(c);
    writeFileSync(join(dir, 'config.mjs'), `export default ${JSON.stringify(c)}`);
    execFileSync(process.execPath, ['build.mjs'], { cwd: dir, env: { ...process.env, SITE_PASSWORD: '', ...env } });
    return { html: readFileSync(join(dir, 'dist/index.html'), 'utf8'), thanks: readFileSync(join(dir, 'dist/dekujeme.html'), 'utf8'), legal: JSON.parse(readFileSync(join(dir, 'dist/legal.json'), 'utf8')), gate: existsSync(join(dir, 'dist/gate.js')) ? readFileSync(join(dir, 'dist/gate.js'), 'utf8') : null };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const ready = c => { c.product.availability = 'skladem'; c.product.price = 449; c.shipping = { ...c.shipping, price: 89, packetaWidgetKey: 'abcdef0123456789' }; c.siteUrl = 'https://kniha.example'; };

test('s úplným nastavením je na stránce pokladna a tlačítka na ni vedou', () => {
  const { html } = build(ready);
  assert.ok(html.includes('id="order-form"') && html.includes('data-packeta-key="abcdef0123456789"') && html.includes('data-price="449" data-shipping="89"'));
  assert.ok(/538\s*Kč/.test(html), 'celková cena včetně dopravy');
  assert.ok(/\+ doprava Zásilkovnou 89\s*Kč/.test(html), 'cena dopravy je vedle ceny knihy');
  assert.ok(html.match(/href="#objednat"/g).length >= 4);
  assert.ok(!html.includes('btn-off'));
  assert.ok(html.includes('"priceCurrency":"CZK"') && html.includes('"url":"https://kniha.example/#objednat"'));
  assert.ok(html.includes('Odesíláme do 2 pracovních dnů'));
});
test('bez dopravy, klíče widgetu, při přípravě nebo vyprodání se pokladna nezobrazí', () => {
  for (const [change, label] of [
    [c => { ready(c); c.shipping.price = null; }, 'Brzy v prodeji'],
    [c => { ready(c); c.shipping.packetaWidgetKey = ''; }, 'Brzy v prodeji'],
    [c => { ready(c); c.product.availability = 'pripravujeme'; }, 'Brzy v prodeji'],
    [c => { ready(c); c.product.availability = 'vyprodano'; }, 'Momentálně vyprodáno'],
  ]) {
    const { html } = build(change);
    assert.ok(!html.includes('id="order-form"'), label);
    assert.ok(html.includes(label) && html.includes('btn-off'));
    assert.ok(!html.includes('"offers"'));
  }
});
test('předprodej ukáže datum expedice', () => {
  const { html } = build(c => { ready(c); c.product.availability = 'predprodej'; c.product.dispatchDate = '2026-12-01'; });
  assert.ok(html.includes('Objednat předem') && html.includes('1. 12. 2026') && html.includes('PreOrder'));
});
test('šablona je celá vyplněná, fonty jsou z vlastního webu, děkovací stránka zmiňuje Zásilkovnu', () => {
  const { html, thanks, legal } = build();
  assert.ok(!/\{\{\w+\}\}/.test(html));
  assert.ok(!html.includes('fonts.googleapis') && !html.includes('fonts.gstatic'));
  assert.ok(thanks.includes('noindex') && thanks.includes('Zásilkovna'));
  assert.ok(legal.terms && legal.privacy);
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  for (const font of css.matchAll(/url\('([^']+\.woff2)'\)/g)) readFileSync(new URL('../' + font[1], import.meta.url));
});
test('HTTP odkazy sestavení odmítne', () => {
  assert.throws(() => build(c => { c.projectUrl = 'http://objev.example'; }));
});

test('heslová brána: bez SITE_PASSWORD žádná, s ním jen otisk hesla', async () => {
  const open = build();
  assert.ok(open.gate === null && !open.html.includes('gate.js') && !open.thanks.includes('gate.js'));
  const password = 'Italské léto 2026!';
  const locked = build(undefined, { SITE_PASSWORD: password });
  assert.ok(locked.html.includes('<script src="gate.js"></script>') && locked.thanks.includes('<script src="gate.js"></script>'));
  assert.ok(locked.html.includes('name="robots" content="noindex"'));
  assert.ok(!locked.gate.includes(password) && !locked.html.includes(password) && !/__(SALT|HASH)__/.test(locked.gate));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('zit-po-italsku'), iterations: 100000 }, base, 256);
  const hex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  assert.ok(locked.gate.includes(`hash = '${hex}'`), 'otisk z buildu odpovídá výpočtu v prohlížeči');
});
