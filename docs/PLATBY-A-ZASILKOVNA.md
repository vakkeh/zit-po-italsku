# Platby (Stripe), Zásilkovna a faktury

Vlastní pokladna bez e-shopové platformy a bez měsíčního paušálu. Platí se jen poplatky Stripe a Zásilkovně.

## Jak to funguje

1. Zákazník na webu zvolí počet kusů a ve widgetu Zásilkovny vybere výdejní místo nebo Z-BOX.
2. Server (`/api/checkout`) spočítá cenu **z `config.mjs`** (ne z prohlížeče) a přesměruje na platební stránku Stripe v češtině. Stripe tam zjistí jméno, e-mail, telefon a fakturační adresu.
3. Po zaplacení Stripe zavolá `/api/stripe-webhook`. Ten:
   - založí zásilku v Zásilkovně (`createPacket`) a uloží **kód zásilky (Z…)** k platbě ve Stripe (metadata `packeta_barcode`),
   - fakturu podle nastavení vystaví Stripe sám, nebo Fakturoid (viz níže).
4. Prodávající vytiskne štítky v [klientské sekci Zásilkovny](https://client.packeta.com/) a knihy odnese na podací místo. Zákazníkovi pošle informace o doručení Zásilkovna.

Opakované volání webhooku nic nezdvojí: co je hotové, je zapsané v metadatech platby. Dočasné výpadky (5xx) vrací chybu 500 a Stripe webhook sám zopakuje (až 3 dny). Trvalé chyby (např. neplatné výdejní místo) se zapíší k platbě jako `packeta_error` / `fakturoid_error`. Zásilku pak stačí založit ručně v klientské sekci.

## Faktury

Výchozí je `INVOICE_PROVIDER=stripe`: Stripe po zaplacení pošle zákazníkovi e-mailem fakturu, resp. doklad o zaplacení. Žádná další služba není potřeba. Cena je 0,4 % z částky, nejvýše 2 USD za fakturu.

- V patičce faktury jsou údaje z `config.mjs` → `seller` (jméno, IČO, adresa, `invoiceNote`, např. „Neplátce DPH.“). Doplňte je.
- Ve Stripe vyplňte Settings → Business → Public details (název, adresa, e-mail podpory). Dále Settings → Customer emails → zapnout e-maily o úspěšných platbách: bez toho Stripe fakturu neodešle. V nastavení faktur zvolte předponu číselné řady.
- **Ověřte zkušební platbou**, že faktura obsahuje vše, co klientka pro svůj daňový režim potřebuje (číslo dokladu, datum, prodávající a IČO, kupující, položky, částka, poznámka o DPH). Jazyk PDF faktury ve Stripe jsme neověřili.

Alternativa: `INVOICE_PROVIDER=fakturoid`. Faktura vznikne ve **Fakturoidu klientky**, označí se jako uhrazená a odešle se česky zákaznici. Vyplatí se, pokud klientka Fakturoid už používá pro účetnictví. Potřebuje tarif s API a bankovní účet nastavený ve Fakturoidu. `INVOICE_PROVIDER=none` faktury nevystavuje.

## Co je potřeba založit

| Služba | Co získat |
|---|---|
| Stripe (účet klientky) | Secret key (`sk_live_…`), webhook secret (`whsec_…`) |
| Zásilkovna (smlouva klientky) | API klíč (16 znaků, veřejný – do `config.mjs`) a API heslo (32 znaků, tajné) z klientské sekce |
| Netlify | Hosting webu + serverových funkcí (zdarma) |
| Fakturoid (jen volitelně) | Client ID a Client Secret z Nastavení → Uživatelský účet, slug účtu |

## Nastavení krok za krokem

1. **`config.mjs`**: `product.price`, `product.availability: 'skladem'`, `product.checkoutMode: 'stripe'`, `shipping.price` (cena dopravy v Kč), `shipping.packetaWidgetKey` (API klíč Zásilkovny), `shipping.weightKg` (hmotnost zabalené knihy), údaje `seller`. Pokladna se na webu ukáže, až jsou vyplněné cena, doprava a klíč widgetu.
2. **Netlify**: připojte repozitář (nastavení je v `netlify.toml`). V Site configuration → Environment variables nastavte:

   | Proměnná | Hodnota |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_test_…` pro testy, pak `sk_live_…` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` z kroku 3 |
   | `PACKETA_API_PASSWORD` | API heslo Zásilkovny |
   | `PACKETA_SENDER` | volitelné: označení odesílatele, pokud jich má účet víc |
   | `INVOICE_PROVIDER` | `stripe` (výchozí), `fakturoid` nebo `none` |
   | `FAKTUROID_SLUG`, `FAKTUROID_CLIENT_ID`, `FAKTUROID_CLIENT_SECRET`, `FAKTUROID_CONTACT_EMAIL` | jen při `fakturoid` |

3. **Stripe → Developers → Webhooks**: přidat endpoint `https://<doména>/api/stripe-webhook` s událostmi `checkout.session.completed` a `checkout.session.async_payment_succeeded`. Zkopírovat jeho signing secret do `STRIPE_WEBHOOK_SECRET`.
4. **Stripe → Settings → Payment methods**: zapnout požadované metody (karty, Apple Pay, Google Pay…). Pokladna je nabízí automaticky. Na webu metody neuvádíme, dokud nejsou ověřené.
5. **Zásilkovna**: v klientské sekci povolit ČR pro widget. Testovat lze na běžném účtu: zásilky, které fyzicky nepodáte, se neúčtují. Testovací zásilky pak v klientské sekci zrušte.
6. **Test**: s `sk_test_` klíčem objednat knihu (testovací karta `4242 4242 4242 4242`). Ve Stripe u platby zkontrolovat metadata `packeta_barcode`, v Zásilkovně zásilku a dorazivší fakturu. Pak přepnout na live klíče a live webhook.
7. Zapněte si ve Stripe e-mailová upozornění na nové platby: tak se klientka o objednávce dozví.

## Před spuštěním prodeje

- Obchodní podmínky, reklamační řád a zásady ochrany osobních údajů musí odpovídat tomuto provozu: Stripe, Zásilkovna, Netlify, případně Fakturoid jako příjemci údajů. Pracovní kostry jsou v `build.mjs` → `legal`. Text tlačítka „Objednat a zaplatit“ a souhlas s podmínkami nechte ověřit spolu s podmínkami.
- Kód nic neukládá mimo Stripe, Zásilkovnu a Fakturoid. Vlastní databáze objednávek není: přehled objednávek je ve Stripe, zásilek v Zásilkovně.
- Sklad se nehlídá automaticky. Při vyprodání přepněte `product.availability` na `vyprodano` a znovu nasaďte.
- Widget Zásilkovny se načítá až po kliknutí na „Vybrat výdejní místo“ (třetí strana, viz zásady ochrany osobních údajů).

## Soubory

- `netlify/functions/checkout.mjs`, `netlify/functions/stripe-webhook.mjs`: tenké vstupy pro Netlify.
- `server/orders.mjs`: tvorba platby a vyřízení po zaplacení.
- `server/stripe.mjs`, `server/packeta.mjs`, `server/fakturoid.mjs`: volání API bez externích balíčků.
- `tests/server.test.mjs`: testy se simulovanými službami (podpis webhooku, cena ze serveru, zásilka, idempotence, Fakturoid).
