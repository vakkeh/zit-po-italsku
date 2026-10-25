# Žít po italsku

Prodejní web ke knize Lindy Valešové ve vizuálním stylu „Dolce vita“. Statická stránka (HTML, CSS, malý JavaScript) a dvě serverové funkce na Netlify pro vlastní pokladnu: platba přes **Stripe**, doprava **Zásilkovnou** na výdejní místo, faktura ze Stripe (nebo z napojené fakturační služby). Bez npm balíčků; sestavení i funkce používají jen standardní knihovnu Node.js 22+. Fonty a obrázky jsou lokální.

```sh
npm run build   # sestaví dist/
npm test        # sestavení ve všech stavech prodeje + serverové funkce se simulovanými službami
npm start       # náhled statické stránky na http://localhost:4173 (bez pokladny)
```

Nasazuje se na Netlify (`netlify.toml`): statický web z `dist/` a funkce z `netlify/functions/`.

## Kde co upravit

| Co | Kde |
|---|---|
| Cena, dostupnost, doprava, kontakty, prodávající | `config.mjs` |
| Texty stránky | `src/index.html` |
| Vzhled | `styles.css` |
| Animace, panely, objednávkový formulář | `app.js` |
| Právní šablony, děkovací stránka | `build.mjs` |
| Platba, zásilka, faktura po zaplacení | `server/` |

Po každé změně spusťte `npm run build`. Tajné klíče (Stripe, API heslo Zásilkovny, fakturační služba) patří do proměnných prostředí na Netlify, nikdy do repozitáře.

Dokud v `config.mjs` nejsou cena, `availability: 'skladem'`, cena dopravy a klíč widgetu Zásilkovny, tlačítka ukazují „Brzy v prodeji“ a pokladna se nezobrazí.

## Dokumentace

- [Platby Stripe, Zásilkovna a faktury (i napojení iDokladu)](docs/PLATBY-A-ZASILKOVNA.md)
- [Nasazení a domény](docs/NASAZENI.md)
- [Obsah, vizuální návrh a podklady](docs/NAVRH.md)
- [Ověření](docs/OVERENI.md)
