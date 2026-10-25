# Nasazení

Nejdříve projděte seznam k doplnění v STRIPE-A-PRAVO.md, nastavte `siteUrl` a spusťte `npm run build` a `npm test`. Zdrojové přílohy ani rukopis nevystavujte na hosting. Publikuje se pouze `dist/`.

## Netlify

Připojte tento GitHub repozitář. Build command: `npm run build`. Publish directory: `dist`. Node.js: 22 nebo 24. Nejsou potřeba proměnné ani tajné klíče. Po prvním nasazení přidejte vlastní doménu v nastavení domén webu, nastavte DNS podle konkrétních pokynů Netlify a ověřte vydání TLS certifikátu.

## Cloudflare Pages

Připojte repozitář, framework preset `None`, build command `npm run build`, výstup `dist`. Použijte Node.js 22+. V Custom domains přidejte hlavní doménu a postupujte podle zobrazených DNS záznamů. Nepoužívejte univerzální A záznam z návodu jiného projektu.

## Klasický hosting

Lokálně spusťte `npm run build`, potom nahrajte **obsah** `dist/` do veřejného webového adresáře. Server musí vracet správné typy pro `.webp`, `.woff2`, `.json`, `.svg`. Zapněte HTTPS a kompresi Brotli/gzip. Nastavte cache statických assetů; protože názvy nejsou hashované, nepoužívejte dlouhou immutable cache bez změny názvů. HTML a `legal.json` ponechte s krátkou cache / revalidací.

Doporučené hlavičky: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, zákaz rámování přes `frame-ancestors 'none'` v CSP. CSP nastavte podle skutečného endpointu formuláře (form-action), newsletteru a případné analytiky; neblokujte legitimní odeslání formuláře. Hosting nesmí vyžadovat Node ani Python za běhu.

## Domény a návaznost

Doporučená struktura: web na vlastní doméně, např. `zitpoitalsku.cz` (příklad, vlastnictví ani dostupnost nejsou ověřené). Platba běží na stránce Stripe, vlastní e-shop ani subdoména nejsou potřeba. Nezapisujte cizí IP odhadem. Oba weby musí mít platné HTTPS. Vyberte kanonickou www/ne-www variantu a druhou přesměrujte.

Po připojení domény nastavte `siteUrl` (a ve Stripe přesměrování po platbě na `siteUrl/dekujeme.html`), znovu sestavte. Ověřte metadata sociálních sítí (absolutní URL obálky), zkušební platbu přes Stripe a návrat na děkovací stránku. Nové veřejné nasazení a nákup nebyly v cloudové přípravě provedeny.

## Živá prohlídka přes GitHub Pages

Připravený soubor `.github/workflows/pages.yml` sestaví a otestuje web a publikuje pouze `dist/`. Spouští se při push do main nebo ručně. Zkusí také zapnout Pages; pokud vestavěný token nemá oprávnění změnit nastavení repozitáře, musí Pages jednou zapnout vlastník. V repozitáři nastavte Settings → Pages → Source: GitHub Actions a poté Actions → Náhled webu na GitHub Pages → Run workflow. Skutečnou adresu zobrazí úspěšná úloha deploy. Dostupnost Pages závisí na viditelnosti repozitáře a tarifu. Tento postup vyžaduje nejprve uložení zdrojů a workflow do GitHubu. Aktuálně nebyl workflow vzdáleně spuštěn a veřejná adresa není potvrzená.

### Nejjednodušší aktivace připraveného náhledu

Statický výstup byl nahrán také do větve `gh-pages`. V Settings → Pages nastavte Source: Deploy from a branch, Branch: gh-pages a Folder: / (root), poté Save. Tato cesta nevyžaduje ruční spouštění workflow. Obsahuje jen veřejný výstup dist, žádný rukopis ani zdrojové přílohy. Stav publikace je nutné ověřit v GitHubu; přístup k API a github.io byl z cloudového prostředí blokován síťovou politikou. Workflow v repozitáři je ponechán jako volitelná ručně spouštěná alternativa pro režim GitHub Actions.
