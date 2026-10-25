# Prodej přes Stripe a příprava spuštění

Web prodává přes **Stripe Payment Link**: jeden odkaz na hostovanou platební stránku Stripe. Web sám nic neúčtuje, nesbírá platební údaje a nepotřebuje server ani API klíče. Všechna tlačítka nákupu vedou na stejný odkaz z `config.mjs`.

## Co doplnit před spuštěním prodeje

- [ ] Účet Stripe pro prodávajícího (Linda nebo firma) s ověřenou identitou a českým bankovním účtem pro výplaty.
- [ ] Produkt „Žít po italsku“ ve Stripe s cenou v Kč včetně DPH.
- [ ] Payment Link (postup níže) a jeho adresu do `STRIPE_PAYMENT_LINK` v `config.mjs`.
- [ ] V `config.mjs`: potvrzená `price` (v kódu je ukázkových 399 Kč), `availability: 'skladem'` nebo `'predprodej'` s `dispatchDate`, `dispatchDays`, `siteUrl`, `contactEmail`, `projectUrl`, `seller`.
- [ ] Zkontrolované obchodní podmínky a zásady ochrany osobních údajů místo pracovních šablon v `build.mjs` (`legal`).
- [ ] Fotka Lindy, potvrzená práva k ilustracím a finální obálka.
- [ ] Zkušební nákup v testovacím režimu Stripe a jeden skutečný nákup s vrácením peněz.

## Payment Link krok za krokem

Názvy položek v administraci Stripe se mohou měnit; aktuální postup ověřte v nápovědě Stripe (Payment Links).

1. **Produkty:** vytvořte produkt s názvem, fotkou obálky a jednorázovou cenou v CZK.
2. **Payment Links → nový odkaz** s tímto produktem.
   - Povolte zákazníkovi změnit množství (dárky).
   - Sbírejte doručovací adresu a omezte země na ČR (případně SK).
   - Přidejte sazby dopravy (např. Zásilkovna, Česká pošta) s cenou a odhadem doručení.
   - Sbírejte telefon, pokud ho dopravce vyžaduje.
   - Souhlas s obchodními podmínkami: vyžaduje vyplněnou adresu podmínek v nastavení veřejných údajů účtu.
3. **Po platbě:** místo potvrzovací stránky Stripe nastavte přesměrování na `siteUrl + /dekujeme.html`.
4. **Způsoby platby:** karta, Apple Pay a Google Pay nabízí Stripe podle zařízení zákazníka; zkontrolujte je v nastavení plateb.
5. **E-maily zákazníkům:** zapněte potvrzení o úspěšné platbě.
6. Odkaz zkopírujte do `config.mjs`, nastavte `availability: 'skladem'` a spusťte `npm run build`.

Faktury: Stripe umí vystavit fakturu k platbě z Payment Linku, případně objednávky převádějte do Fakturoidu. Ověřte, že faktura obsahuje údaje vyžadované českými předpisy.

## Jak web reaguje na nastavení

| `availability` | Payment Link | Tlačítka |
|---|---|---|
| `skladem` | vyplněný | „Objednat knihu“ → Stripe |
| `predprodej` + `dispatchDate` | vyplněný | „Objednat předem“ → Stripe, s datem expedice |
| `pripravujeme` nebo chybí odkaz/cena | — | neaktivní „Brzy v prodeji“ |
| `vyprodano` | — | neaktivní „Momentálně vyprodáno“ |

Sestavení odmítne odkazy bez HTTPS. Testy (`npm test`) ověřují všechny stavy.

## Osobní údaje a právní texty

Platební a doručovací údaje zpracovává Stripe jako zpracovatel prodávajícího. Web nemá formuláře, databázi, cookies ani analytiku a fonty i obrázky načítá z vlastní domény. Do zásad ochrany osobních údajů uveďte správce (prodávajícího), Stripe jako příjemce a předávání údajů mimo EHP podle aktuálních smluv Stripe, dopravce, dobu uchování a práva subjektů údajů. Do obchodních podmínek uveďte prodávajícího, ceny včetně DPH, dopravu, platby, 14denní lhůtu pro odstoupení, reklamace a mimosoudní řešení sporů u ČOI.

Pracovní šablony obou dokumentů jsou v `build.mjs` (`legal`) a na webu se otevírají z patičky s upozorněním, že jde o šablony. Před spuštěním je nahraďte zkontrolovanými texty.
