# Podklady a návrh

## Co vyplývá z knihy

Zdroj: `ZIT_PO_ITALSKU_finalni_korektura.docx`, přiložený uživatelem. Osobní vyprávění v první osobě oslovuje čtenáře vykáním; web proto rovněž vyká. Nejde o cestopis. Témata zahrnují čas, rána, jídlo, styl, komunikaci, práci, odpočinek, rodinu, vztahy, samotu a domov. Obsah má 16 kapitol, úvod, závěr a dodatek „30 malých rozhodnutí pro pomalejší život“. Biografie uvádí více než třináct let vztahu k italštině a kultuře; další životopisné údaje nebyly domýšleny.

Dvě doslovné ukázky:

> „Vaše italská cesta nezačíná v Itálii. Začíná ve chvíli, kdy se rozhodnete žít jinak.“

Zdroj: úvodní motto rukopisu.

> „Život nezačne, až budete mít víc času. Začne ve chvíli, kdy mu ten čas dáte.“

Zdroj: konec dodatku „30 malých rozhodnutí pro pomalejší život“.

Tipy v kartách parafrázují skutečný obsah: ráno bez telefonu, vědomé stolování a odpočinek bez výkonu. Všechny názvy kapitol odpovídají obsahu rukopisu. Ohlasy jsou výslovně označená místa pro budoucí recenze, žádná hodnocení ani zákaznické citace nebyly vymyšleny.

## Obálka a paleta

Zdroj: `Linda info o knize.pdf`, vložený návrh přední obálky na straně 2. Použit skutečný vložený obrázek 512 × 800 px. Bodové RGB vzorky původního obrázku (počátek vlevo nahoře):

| Prvek | Souřadnice pixelu | HEX |
|---|---|---|
| Moře | 400, 430 | `#219DAC` |
| Nebe | 50, 70 | `#3971A4` |
| Obilí | 142, 616 | `#F1D16E` |
| Olivovník | 360, 538 | `#5F8273` |
| Světlá plocha | 208, 536 | `#FCF9F2` |

Pro text a tlačítka jsou použity tmavší doplňující odstíny `#253E3B` a `#205C58`, pro vedlejší text `#596660`. Pestrá ilustrace dostává na webu prostor proti klidnému krémovému pozadí. Knižní mockup je vytvořen CSS, takže lze vyměnit obálku bez úpravy obrázku.

Cormorant Garamond je klasická knižní antikva pro nadpisy a citát; Commissioner je klidné bezpatkové písmo pro text a ovládání. Oba fonty mají českou diakritiku, licenci OFL (assets/fonts) a jsou hostované lokálně, takže web neposílá požadavky na Google. Vizuální směr „Dolce vita“: zlatá hodinka nad mořem, broskvové nebe, slunce a tyrkysová hladina; kniha stojí na horizontu v úvodu i v závěrečné nákupní scéně.

Doprovodné ilustrace byly vytaženy z rukopisu a převedeny do WebP. Nebyla dodána autentická fotografie autorky; místo pro ni je viditelně označené. Ilustrace ženy nepředstírá její portrét. Před veřejným nasazením potvrďte oprávnění k obrázkům i finální podobu obálky.

## Technická volba

Čistý statický web s malým sestavovacím skriptem: žádný framework, balíček ani klientské vykreslování obsahu. Výsledné HTML obsahuje texty i SEO bez JavaScriptu. JavaScript řeší jen jemné animace, právní dialog a e-mailovou záložní variantu formuláře. `prefers-reduced-motion` animace vypíná. Obrázky mají rozměry, níže na stránce lazy loading, obálka prioritu načtení.

Parametry 135 × 210 mm, 160 stran a V2 vycházejí z nabídky tiskárny uvedené v PDF. Na webu jsou označeny k finálnímu potvrzení. Cena, ISBN, dostupnost a termín expedice nejsou v podkladech potvrzené.
