# Shoptet a příprava prodeje

> Výchozí režim je nyní vlastní pokladna Stripe + Zásilkovna: viz [PLATBY-A-ZASILKOVNA.md](PLATBY-A-ZASILKOVNA.md). Části o Shoptetu níže platí jen při `checkoutMode: 'product'` nebo `'cart'`. Seznam k doplnění a právní kostry platí v obou režimech.

## Co doplnit před zveřejněním prodeje

- [ ] Finální produktovou URL v Shoptetu (`SHOPTET_PRODUCT_URL`).
- [ ] Cenu včetně DPH, skutečný sklad/předprodej, u předprodeje datum expedice.
- [ ] Potvrzený počet stran, vazbu, rozměry, ISBN, finální obálku a kvalitní produktové fotografie.
- [ ] Vlastní fotografii Lindy a potvrzená práva k obrazovým podkladům.
- [ ] Odkaz na Objev Itálii a skutečné sociální profily.
- [ ] Jméno/firmu prodávajícího, IČO, sídlo, e-mail a případný telefon.
- [ ] Dopravce, ceny a doby doručení po ČR, platební metody podle smluv a nastavení e-shopu.
- [ ] Zkontrolované obchodní podmínky, reklamace, odstoupení a ochranu osobních údajů. Nahraďte pracovní právní texty a označení v generátoru.
- [ ] Veřejný newsletter formulář, názvy polí, double opt-in, samostatný účel naskladnění, možnost odhlášení a právní informace; poté `newsletter.privacyReady: true`.
- [ ] Skutečnou doménu `siteUrl`; otestujte OG obrázek a canonical.
- [ ] Skutečné ohlasy pouze se souhlasem, bez výchozích vymyšlených recenzí.

## Prodejní odkazy

Jedna produktová URL řídí všechna CTA. UTM: `utm_source=onepager`, `utm_medium=web`, `utm_campaign=zit-po-italsku`, `utm_content=header|hero|order|mobile|schema`. Existující produktové parametry se zachovávají; odkazy se otevírají ve stejném okně. Kód nic nevkládá do košíku a nic neúčtuje.

Volba `checkoutMode: 'cart'` použije pouze explicitní `verifiedCartUrl`. Bez ní zachová produktovou kartu. **TODO: ověřit** konkrétní Shoptet URL na reálném produktu v aktuální dokumentaci. Univerzální syntaxe nebyla odhadnuta. Při přípravě byl oficiální web https://podpora.shoptet.cz/ nedostupný s HTTP 403; aktuální menu ani syntaxe tedy nebyly potvrzeny. Výchozí produktová karta je spolehlivější volba. Toto není důvod udělovat webu API klíče.

## Vzhled Shoptetu

Nastavte primární tlačítka na `#205C58`, světlý podklad `#FCF9F2`, text `#253E3B`. Tyrkysovou a žlutou obálky použijte jako doplňky; ne jako světlý drobný text. Nahrajte logo/wordmark a favicon. Podle možností šablony použijte Lora pro nadpisy a DM Sans pro text (s českými znaky), případně blízké dostupné alternativy. Banner vytvořte ze skutečné obálky, ve stejném klidném tónu. Použijte stejný název, podtitul, biografii, parametry a produktové fotografie. Přidejte viditelný odkaz zpět na hlavní web.

## Kde hledat nastavení v administraci

Následující názvy jsou orientační vodítka, nikoli ověřené aktuální klikací cesty. Liší se podle tarifu, vzhledu a doplňků. Aktuální postup ověřte vyhledáním uvedeného názvu v oficiální nápovědě https://podpora.shoptet.cz/ nebo přímo vyhledáváním administrace.

1. **Zásilkovna:** sekce Doprava a platby / Způsoby dopravy, případně napojení Zásilkovny mezi doplňky. Aktivujte smluvní účet dopravce, nastavte výdejní místa a zvlášť doručení na adresu, ceny, hmotnostní pravidla a dostupnost pouze pro ČR. Proveďte test výběru pobočky. Českou poštu nabídněte jen pokud ji skutečně poskytujete.
2. **Platební brána:** sekce způsobů plateb a nastavení konkrétní brány (např. Shoptet Pay, pokud ji používáte). Dokončete aktivaci a testovací transakci. Kartu, Apple Pay a Google Pay uvádějte pouze po ověření skutečné podpory. Převod potřebuje správný účet a instrukce v potvrzení.
3. **Potvrzovací e-mail:** vyhledejte E-maily / Automatické zasílání, konkrétně potvrzení přijetí objednávky a zprávy podle stavů. Zachovejte systémové proměnné objednávky, rozpis ceny, dopravu, platební pokyny a kontakt. Udělejte testovací objednávku a zkontrolujte doručení i mobilní zobrazení.
4. **Děkovací stránka:** přeneste text z `dist/dekujeme.html` do podporovaného místa potvrzení dokončené objednávky. Neodstraňujte systémové číslo objednávky, stav platby ani další instrukce. Samotný onepager nepoznává zaplacení.

Šablona textu: „Děkujeme. Vaše italská chvíle je o stránku blíž. Potvrzení objednávky a informace k platbě najdete v e-mailu z našeho e-shopu. Než kniha dorazí, zkuste si dát jednu kávu bez telefonu. Jen tak, pro sebe.“

## Newsletter a osobní údaje

Onepager bez vlastní databáze odesílá e-mail a souhlas přímo poskytovateli veřejného formuláře. I to je zpracování osobních údajů; popište skutečného správce, poskytovatele a účel. Použijte veřejný formulář Ecomail/SmartEmailing/MailerLite odpovídající vašemu účtu, nikoli privátní API s tokenem. `emailField`, `consentField` a `hiddenFields` nastavte podle vygenerovaného formuláře poskytovatele. Endpoint musí podporovat běžný HTML POST a vlastní potvrzení/chyby. Reálné doručení, odhlášení a double opt-in otestujte v cílové službě. E-mailová záloha vyžaduje nainstalovaného klienta a skutečné odeslání zprávy.

Při vyprodání formulář požaduje upozornění na naskladnění a odesílá `purpose=naskladneni`; formulářový endpoint musí hodnotu skutečně přijímat a rozlišovat. Bez jeho konfigurace zůstává formulář vypnutý. Nepoužívejte takový souhlas automaticky pro jiné marketingové kampaně.

## Právní kostry — nutno doplnit a zkontrolovat

**Jde pouze o pracovní osnovy, nikoli hotové právní dokumenty. Před použitím je nechte zkontrolovat, doplňte údaje o prodávajícím a přizpůsobte skutečné nabídce i aktuálním předpisům.** Stejné kostry jsou dostupné v dialogových oknech na stránce; editují se v objektu `legal` v `build.mjs`.

### Obchodní podmínky

Prodávající: [JMÉNO/FIRMA], IČO [IČO], sídlo [ADRESA], kontakt [E-MAIL, TELEFON]. Působnost: prodej tištěné knihy spotřebitelům v ČR. Doplňte objednání a vznik smlouvy, opravy objednávky, cenu včetně DPH, platbu, dopravu a dodání, práva z vad, odstoupení a náklady na vrácení, vyřizování stížností a mimosoudní řešení sporů u ČOI. Uveďte účinnost [DATUM].

### Reklamační řád

Prodávající [ÚDAJE], adresa pro reklamace [ADRESA], kontakt [E-MAIL]. Popište práva z vadného plnění, způsob a doklady uplatnění reklamace, potvrzení jejího přijetí, zákonné lhůty vyřízení, náklady a způsob oznámení výsledku. Přizpůsobte skutečnému procesu e-shopu.

### Odstoupení od smlouvy

Spotřebitel může při dálkovém nákupu tištěné knihy zpravidla odstoupit do 14 dnů od převzetí. Doplňte poučení o lhůtě, adresu a způsob oznámení, vrácení zboží, náklady na vrácení, odpovědnost za snížení hodnoty a způsob i zákonnou lhůtu vrácení plateb.

Vzor: „Adresát [PRODÁVAJÍCÍ, ADRESA, E-MAIL]. Oznamuji, že odstupuji od smlouvy na knihu [NÁZEV]. Číslo objednávky [ČÍSLO], převzato dne [DATUM]. Jméno [JMÉNO], adresa [ADRESA], datum [DATUM], podpis při listinném podání [PODPIS].“

### Ochrana osobních údajů

Správce [JMÉNO/FIRMA, IČO, ADRESA, KONTAKT]. Doplňte kategorie údajů, účely a právní tituly zvlášť pro objednávky, newsletter, naskladnění a technické logy. Uveďte konkrétní zpracovatele, příjemce, dobu uchování, případné předávání mimo EHP, odhlášení a odvolání souhlasu. Popište příslušná práva subjektu údajů a stížnost u ÚOOÚ.

### Analytika a cookies

Výchozí web nenačítá analytiku ani neukládá cookies. Plausible je pouze zakomentovaný vzor. Neaktivní `<template id="cookie-banner-template">` je vizuální základ pro budoucí cookie lištu, nikoli hotový consent manager. Před aktivací GA4 musíte doplnit skutečné blokování skriptů před souhlasem, stejně snadné odmítnutí, uchování a odvolání volby, a ověřit chování v prohlížeči. Aktivní měření není součástí tohoto dodání.
