import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import config from '../config.mjs';

// Sestaví web v dočasné složce s upravenou konfigurací a vrátí vygenerované HTML.
function build(link, change) {
  const dir = mkdtempSync(join(tmpdir(), 'zit-build-'));
  try {
    for (const f of ['build.mjs', 'commerce.mjs', 'styles.css', 'app.js']) cpSync(new URL('../' + f, import.meta.url), join(dir, f));
    for (const d of ['src', 'assets']) cpSync(new URL('../' + d, import.meta.url), join(dir, d), { recursive: true });
    const c = structuredClone(config); change?.(c);
    writeFileSync(join(dir, 'config.mjs'), `export const STRIPE_PAYMENT_LINK=${JSON.stringify(link)}; export default ${JSON.stringify(c)}`);
    execFileSync(process.execPath, ['build.mjs'], { cwd: dir });
    return { html: readFileSync(join(dir, 'dist/index.html'), 'utf8'), thanks: readFileSync(join(dir, 'dist/dekujeme.html'), 'utf8'), legal: JSON.parse(readFileSync(join(dir, 'dist/legal.json'), 'utf8')) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const LINK = 'https://buy.stripe.com/test_abc123';

test('skladem: všechna tlačítka vedou na Stripe a schema nabízí knihu', () => {
  const { html } = build(LINK, c => { c.product.availability = 'skladem'; });
  assert.equal(html.match(/href="https:\/\/buy\.stripe\.com\/test_abc123"/g).length, 6);
  assert.ok(!html.includes('btn-off'));
  assert.ok(html.includes('"priceCurrency":"CZK"') && html.includes('"price":399'));
  assert.ok(html.includes('Odesíláme do 2 pracovních dnů'));
});
test('bez odkazu nebo při vyprodání web nákup nenabízí', () => {
  for (const [link, availability, label] of [['', 'skladem', 'Brzy v prodeji'], [LINK, 'vyprodano', 'Momentálně vyprodáno'], [LINK, 'pripravujeme', 'Brzy v prodeji']]) {
    const { html } = build(link, c => { c.product.availability = availability; });
    assert.ok(!html.includes('buy.stripe.com'), availability);
    assert.ok(html.includes(label), label);
    assert.ok(!html.includes('"offers"'));
  }
});
test('předprodej ukáže datum expedice', () => {
  const { html } = build(LINK, c => { c.product.availability = 'predprodej'; c.product.dispatchDate = '2026-12-01'; });
  assert.ok(html.includes('Objednat předem') && html.includes('1. 12. 2026') && html.includes('PreOrder'));
});
test('šablona je celá vyplněná, fonty a obrázky jsou z vlastního webu', () => {
  const { html, thanks, legal } = build('');
  assert.ok(!/\{\{\w+\}\}/.test(html));
  assert.ok(!html.includes('fonts.googleapis') && !html.includes('fonts.gstatic'));
  assert.ok(html.includes('<h1') && html.includes('rel="canonical"'));
  assert.ok(thanks.includes('noindex'));
  assert.ok(legal.terms && legal.privacy);
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  for (const font of css.matchAll(/url\('([^']+\.woff2)'\)/g)) readFileSync(new URL('../' + font[1], import.meta.url));
});
test('HTTP odkazy sestavení odmítne', () => {
  assert.throws(() => build('http://buy.stripe.com/x', c => { c.product.availability = 'skladem'; }));
});
