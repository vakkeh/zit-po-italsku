# Nasazení

Nejdříve projděte nastavení plateb a dopravy v PLATBY-A-ZASILKOVNA.md, nastavte `siteUrl` a spusťte `npm run build` a `npm test`. Zdrojové přílohy ani rukopis nevystavujte na hosting. Publikuje se pouze `dist/`.

## Netlify

Doporučený hosting, protože jen ten v tomto projektu spouští serverové funkce pokladny (`netlify/functions`, nastavení v `netlify.toml`). Připojte tento GitHub repozitář; build command, výstup `dist` i Node.js 22 se načtou z `netlify.toml`. Tajné klíče pro Stripe a Zásilkovnu nastavte v Environment variables podle [PLATBY-A-ZASILKOVNA.md](PLATBY-A-ZASILKOVNA.md). Po prvním nasazení přidejte vlastní doménu v nastavení domén webu, nastavte DNS podle konkrétních pokynů Netlify a ověřte vydání TLS certifikátu.

## Cloudflare Pages, klasický hosting, GitHub Pages

Tyto varianty publikují jen statický web: pokladna Stripe + Zásilkovna na nich **nefunguje** (chybí `/api/checkout` a `/api/stripe-webhook`). Použijte je jen pro náhled nebo s režimem Shoptet.

### Cloudflare Pages

Připojte repozitář, framework preset `None`, build command `npm run build`, výstup `dist`. Použijte Node.js 22+. V Custom domains přidejte hlavní doménu a postupujte podle zobrazených DNS záznamů. Nepoužívejte univerzální A záznam z návodu jiného projektu.

### Klasický hosting

Lokálně spusťte `npm run build`, potom nahrajte **obsah** `dist/` do veřejného webového adresáře. Server musí vracet správné typy pro `.webp`, `.woff2`, `.json`, `.svg`. Zapněte HTTPS a kompresi Brotli/gzip. Nastavte cache statických assetů; protože názvy nejsou hashované, nepoužívejte dlouhou immutable cache bez změny názvů. HTML a `legal.json` ponechte s krátkou cache / revalidací.

Doporučené hlavičky: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, zákaz rámování přes `frame-ancestors 'none'` v CSP. CSP nastavte podle skutečného endpointu formuláře (form-action), newsletteru a případné analytiky; neblokujte legitimní odeslání formuláře. Hosting nesmí vyžadovat Node ani Python za běhu.

## Domény a návaznost

Doporučená struktura: web na vlastní doméně, např. `zitpoitalsku.cz` (příklad, vlastnictví ani dostupnost nejsou ověřené). Platba běží na stránce Stripe a pokladnu obsluhují serverové funkce na stejné doméně (Netlify), subdoména pro e-shop není potřeba. Nezapisujte cizí IP odhadem. Web musí mít platné HTTPS. Vyberte kanonickou www/ne-www variantu a druhou přesměrujte.

Po připojení domény nastavte `siteUrl`, ve Stripe webhook na `https://<doména>/api/stripe-webhook` a znovu nasaďte. Návrat po platbě na `dekujeme.html` nastavuje server sám. Ověřte metadata sociálních sítí (absolutní URL obálky), zkušební platbu přes Stripe a návrat na děkovací stránku. Nové veřejné nasazení a nákup nebyly v cloudové přípravě provedeny.

## Živá prohlídka přes GitHub Pages

Připravený soubor `.github/workflows/pages.yml` sestaví a otestuje web a publikuje pouze `dist/`. Spouští se při push do main nebo ručně. Zkusí také zapnout Pages; pokud vestavěný token nemá oprávnění změnit nastavení repozitáře, musí Pages jednou zapnout vlastník. V repozitáři nastavte Settings → Pages → Source: GitHub Actions a poté Actions → Náhled webu na GitHub Pages → Run workflow. Skutečnou adresu zobrazí úspěšná úloha deploy. Dostupnost Pages závisí na viditelnosti repozitáře a tarifu. Tento postup vyžaduje nejprve uložení zdrojů a workflow do GitHubu. Aktuálně nebyl workflow vzdáleně spuštěn a veřejná adresa není potvrzená.

### Nejjednodušší aktivace připraveného náhledu

Statický výstup byl nahrán také do větve `gh-pages`. V Settings → Pages nastavte Source: Deploy from a branch, Branch: gh-pages a Folder: / (root), poté Save. Tato cesta nevyžaduje ruční spouštění workflow. Obsahuje jen veřejný výstup dist, žádný rukopis ani zdrojové přílohy. Stav publikace je nutné ověřit v GitHubu; přístup k API a github.io byl z cloudového prostředí blokován síťovou politikou. Workflow v repozitáři je ponechán jako volitelná ručně spouštěná alternativa pro režim GitHub Actions.
