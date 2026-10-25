# Ověření

Sestavení a testy: `npm run build`, `npm test` (Node.js 22+, bez instalace balíčků). Testy sestaví web v dočasné složce pro všechny stavy prodeje (skladem, předprodej, připravujeme, vyprodáno, chybějící doprava nebo klíč widgetu) a kontrolují objednávkový formulář, schema.org nabídku, vyplnění šablony, lokální fonty a odmítnutí HTTP odkazů. Serverové testy se simulovanými službami ověřují podpis webhooku Stripe, cenu ze serveru, založení zásilky v Zásilkovně, idempotenci a Fakturoid.

Ruční kontrola v Chromiu (Playwright) na šířkách 320–1920 px včetně telefonu na šířku:

- úvod: titul, tlačítko a kniha na horizontu na první obrazovce, nic nepřetéká do strany;
- Italský den: na počítači správný obrázek a barva pro každý krok i při rychlém scrollu a ve vloženém rámu, na telefonu posuvné karty s tečkami;
- obsah knihy a právní šablony v panelu, zavření křížkem, klávesou Esc i klepnutím vedle, fokus vrácený při ovládání klávesnicí;
- fonty Cormorant Garamond a Commissioner načtené z `assets/fonts`, žádné požadavky na cizí domény;
- `prefers-reduced-motion` vypíná animace.

Neověřeno: skutečná platba přes Stripe a zásilka v Zásilkovně (chybí klíče a nasazení na Netlify), widget Zásilkovny v prohlížeči, doručení e-mailů Stripe, finální doména a náhledy při sdílení na sociálních sítích.
