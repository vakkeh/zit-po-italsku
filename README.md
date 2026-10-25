# Žít po italsku

Prodejní web ke knize Lindy Valešové. Statická stránka (HTML, CSS, malý JavaScript) bez runtime závislostí; sestavení používá jen standardní knihovnu Node.js 22+. Fonty a obrázky jsou lokální, web nevolá žádné cizí služby. Nákup probíhá přes Stripe Payment Link.

```sh
npm run build   # sestaví dist/
npm test        # ověří sestavení ve všech stavech prodeje
npm start       # náhled na http://localhost:4173
```

Na hosting patří jen obsah `dist/`.

## Kde co upravit

| Co | Kde |
|---|---|
| Cena, dostupnost, Stripe odkaz, kontakty, prodávající | `config.mjs` |
| Texty stránky | `src/index.html` |
| Vzhled | `styles.css` |
| Animace (Italský den, moře, panely) | `app.js` |
| Právní šablony, děkovací stránka | `build.mjs` |

Po každé změně spusťte `npm run build`. Do konfigurace nikdy nevkládejte API klíče ani jiné tajné údaje.

Dokud `config.mjs` neobsahuje Stripe odkaz a `availability: 'skladem'`, tlačítka ukazují „Brzy v prodeji“ a nic se neprodává.

## Dokumentace

- [Prodej přes Stripe, právní texty a seznam k doplnění](docs/STRIPE-A-PRAVO.md)
- [Obsah, vizuální návrh a podklady](docs/NAVRH.md)
- [Nasazení a domény](docs/NASAZENI.md)
