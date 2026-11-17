# Catálogo inicial — borrador

> Generado a partir de `sverre-book-sv.pdf` (28 páginas, 2026-11-16).
> **Todas las duraciones son estimaciones**, salvo los tiempos de horno, que vienen de la receta. Fer debe revisarlas.
> Los nombres de los momentos están en sueco porque se imprimen en el PDF.
> Claude Code: convertir este fichero en el fixture `src/scheduler/__fixtures__/katalog.json` y usarlo en los tests.

## Notación

`typ min[–max]` Moment — recurso · banderas

- **typ**: `aktiv` (ocupa cocinero), `väntan` (no ocupa cocinero), `tillsyn X/Y` (espera con intervención de X min cada Y min)
- **Ugn**: modo, temperatura (o rango) y bleck
- **Banderas**: `⇢0` = debe empezar justo después del momento anterior · `avbrytbar` · `efter-öppning` (la preparación puede terminar después de las 16:00) · `senast-möjligt` (frescura) · `följdsteg` · `beroende: X`

---

## Bröd

### Bröd smet
- `aktiv 10` Förbered 6 pacojetburkar med spritpåsar och plastremsor
- `aktiv 10` Blanda torra ingredienser, tillsätt sirap och filmjölk
- `aktiv 10` Fyll spritpåsarna, ställ i kyl

### Vispat brynt smör — steg 1 · `följdsteg: steg 2`
- `aktiv 5` Skär 1 kg smör i bitar
- `tillsyn 1/5 20` Bryn smöret till 120 °C — Spisplatta
- `väntan` Svalna över natten (fuera del plan)

### Vispat brynt smör — steg 2
- `aktiv 10` Mixa brynt smör + 1 kg smör slätt — Thermomix
- `aktiv 10` Fördela i 4 spritpåsar

## Efterrätt

### Bakade äpple
- `aktiv 15` Skala, kärna ur och tärna äpplena, strö över socker
- `väntan 12` Baka — Ugn varmluft 175 °C, 1 bleck
- `väntan 15` Svalna

### Chokladbavaroise
- `aktiv 2` Blötlägg gelatinblad
- `aktiv 10` Koka mjölk, sjud med äggula och socker till 83 °C — Spisplatta
- `aktiv 5` Gelatin, sila över chokladen, mixa ⇢0
- `väntan 30` Svalna
- `aktiv 8` Lättvispa grädde och vänd ner

### Chokladsorbet
- `aktiv 2` Blötlägg gelatin
- `aktiv 10` Värm alla ingredienser, lös upp gelatinet — Spisplatta
- `aktiv 5` Fyll pacojetburkar ⇢0
- `väntan 30` Svalna (luego congelar)

### Havresmulor
- `aktiv 10` Blanda till smulor, fördela på bleck
- `väntan 10–12` Baka (rör om vid behov) — Ugn varmluft 170 °C, 1 bleck
- `väntan 20` Svalna helt

### Kondenserade mjölk
- `aktiv 5` Blanda, fyll 2 spritpåsar

### Rostad vit choklad
- `aktiv 3` Lägg chokladen på bleck
- `väntan 5` Rosta — Ugn varmluft 170 °C, 1 bleck
- `väntan 15` Svalna
- `aktiv 5` Hacka

### Svartvinbärssorbet
- `aktiv 2` Blötlägg gelatin
- `aktiv 10` Koka upp puré, socker och vatten, tillsätt gelatin — Spisplatta
- `aktiv 5` Fyll 3 pacojetburkar
- `väntan 30` Svalna (luego congelar)

### Vaniljglass
- `aktiv 2` Blötlägg gelatin
- `tillsyn 1/3 15` Värm till 85 °C — Spisplatta
- `aktiv 5` Lös upp gelatinet, fyll 4 pacojetburkar ⇢0
- `väntan 30` Svalna (luego congelar)

## Förrätt / Förrätter

### Hasselnötter
- `väntan 10` Rosta — Ugn varmluft 160–170 °C, 1 bleck
- `väntan 15` Svalna
- `aktiv 5` Krossa, fyll 1/9-kantin

### Brynt smör (löjrom)
- `tillsyn 1/3 10` Bryn smöret till 125 °C — Spisplatta
- `aktiv 3` Tillsätt citronsaft, häll i klämflaska

### Dillolja
- `aktiv 8` Mixa dill, olja och salt till 70 °C — Thermomix
- `väntan 20` Svalna
- `väntan 30` Sila genom kaffefilter
- `aktiv 2` Häll i liten låda

### Hackad karljohansvamp
- `aktiv 3` Mal svampen — Thermomix

### Svartrot
- `aktiv 20` Tvätta och skala
- `aktiv 5` Krydda och vakuumförpacka
- `väntan 30` Ånga — Ugn ånga 100 °C, 1 bleck

## Kräm

### J-K majonnäs
- `aktiv 10` Skala och kvarta jordärtskockor, olja och salt
- `väntan 20–30` Rosta tills mjuka — Ugn varmluft 180 °C, 1 bleck
- `väntan 20` Svalna
- `aktiv 10` Mixa med äggula, vinäger, senap, salt; emulgera med olja — Thermomix
- `aktiv 5` Fyll 3 spritpåsar

### Karljohanmajonnäs
- `aktiv 12` Mixa svamp till pulver, sedan majonnäs — Thermomix
- `aktiv 5` Fyll 3 spritpåsar

### Misomajonnäs
- `aktiv 10` Majonnäs med miso — Thermomix
- `aktiv 5` Fyll 3 spritpåsar

### Ostkräm
- `aktiv 5` Riv osten
- `aktiv 10` Majonnäs med ost — Thermomix
- `aktiv 5` Fyll 3 spritpåsar

### Rotsellerikräm
- `aktiv 20` Skala och tärna 2 kg rotselleri, salt, olja, lite vatten
- `väntan 30` Tillaga — Ugn varmluft 180 °C, 2 bleck (¿o kombi? la receta añade agua para tener vapor)
- `aktiv 10` Mixa — Thermomix
- `aktiv 3` Smaka av, fyll 2 kantiner

## Picklat

### Citronsteklökar
- `aktiv 15` Skala och halvera lökarna
- `väntan 8` Koka upp citronsaft och socker — Spisplatta
- `aktiv 5` Koka löken 5 min — Spisplatta ⇢0
- `väntan 30` Svalna i lagen

### Inlagd fänkål
- `aktiv 15` Skiva fänkål på mandolin
- `väntan 10` Koka upp 1-2-3-lag — Spisplatta
- `aktiv 3` Häll över, tynga ner

### Inlagda granskott
- `väntan 5` Koka upp 1-2-3-lag — Spisplatta
- `aktiv 2` Häll över granskotten
- `väntan 30` Svalna

### Picklad rotselleri
- `aktiv 15` Skala och skiva på mandolin
- `väntan 10` Koka upp 1-2-3-lag — Spisplatta
- `aktiv 3` Häll över, tynga ner

### Picklade gröna tomater
- `aktiv 10` Skiva på mandolin
- `väntan 10` Koka upp 1-2-3-lag — Spisplatta
- `väntan 20` Svalna till ljummen
- `aktiv 3` Häll över, tynga ner

### Syrad spetskål
- `aktiv 15` Skala och skiva löken på mandolin
- `väntan 10` Koka upp 1-2-3-lag med senapsfrö — Spisplatta
- `aktiv 3` Häll den varma lagen över löken ⇢0
- `väntan 30` Svalna
- `aktiv 15` Skär spetskålen, blanda med löken och lagen i djupt bleck, täck
- (Flytta till stor låda i slutet av dagen: fuera del plan)

## Protein

### Tartar kött
- `aktiv 10` Kör köttet i köttkvarnen

### Panerad schnitzel
- `aktiv 30` Putsa, banka och dubbelpanera (depende de la cantidad)

## Snacks

### Potatis chips — **SIN PASOS: Fer debe definir las fases**
### Gröna oliver — **SIN PASOS**

## Såser

### Brynt smör (3 l)
- `aktiv 5` Skär 3 kg smör i bitar
- `tillsyn 1/4 25` Smält och bryn under omrörning till 120–122 °C — Spisplatta
- `aktiv 5` Timjan, smaka av med salt och vinäger

### Vinägersky · `efter-öppning`
- `aktiv 3` Blanda alla ingredienser — Spisplatta
- `tillsyn 1/15 150` Reducera till hälften, skumma regelbundet — Spisplatta · `avbrytbar`
- `aktiv 5` Sila ner i stor plastlåda
- `väntan 30` Svalna

### Smöradsky · `beroende: Vinägersky`
- `aktiv 10` Värm vinägerskyn, vispa ner kallt smör — Spisplatta

### Smörsås · `efter-öppning`
- `aktiv 10` Skala schalottenlök och vitlök
- `väntan 10` Koka upp vin, schalottenlök, vitlök och timjan — Spisplatta
- `väntan 60–90` Reducera till hälften — Spisplatta · `avbrytbar`
- `aktiv 5` Sila vinreduktionen
- `aktiv 10` Tillsätt grädde och smör, värm tills smält — Spisplatta
- `aktiv 5` Xantan, stavmixa, smaka av
- `väntan 30` Svalna i stor plastlåda

### Kokta potatis i brynt smör · `beroende: Friterad potatis, Brynt smör` — **SIN PASOS**

## Tillbehör

### Broccoli · `senast-möjligt`
- `aktiv 10` Dela i buketter, lägg i 1/3 GN-kantin
- `väntan 10` Koka upp vatten med salt och bikarbonat — Spisplatta
- `aktiv 2` Häll över broccolin, tynga ner ⇢0
- `väntan 20` Låt stå
- `aktiv 2` Kontrollera konsistensen

### Friterad potatis (kokt)
- `aktiv 10` Halvera potatisen, täck med vatten, salt
- `väntan 10` Koka upp — Spisplatta
- `väntan 20–30` Koka tills mjuk — Spisplatta
- `aktiv 3` Häll av ⇢0

### Gulbetor
- `aktiv 10` Kvarta, olja och salt
- `väntan 30` Rosta — Ugn varmluft 180 °C, 1 bleck
- `aktiv 2` Kontrollera att de är mjuka

### Hängt gräddfil — steg 1 · `följdsteg: steg 2`
- `aktiv 5` Kaffefilter i sil, häll i gräddfilen, täck, ställ i kyl
- (över natten: fuera del plan)

### Hängt gräddfil — steg 2
- `aktiv 5` Fyll 2 spritpåsar

### Mandlar
- `aktiv 5` Krossa marconamandlar

### Rostade jordärtskockor
- `aktiv 15` Halvera eller kvarta, olja och salt
- `väntan 30` Rosta — Ugn varmluft 180 °C, 2 bleck

### Rostade palsternacka
- `aktiv 20` Skala och skär i sneda bitar
- `väntan 10` Koka upp — Spisplatta
- `väntan 20–30` Koka tills mjuka — Spisplatta
- `aktiv 5` Häll av, fyll 1/3-kantiner ⇢0

### Rödlöksmarmelad
- `aktiv 15` Skala och skiva rödlök
- `tillsyn 2/5 45–60` Svetta, tillsätt socker och vinäger, koka till marmelad — Spisplatta
- `väntan 30` Svalna
- `aktiv 5` Fyll 3 spritpåsar

### Äggskum · `senast-möjligt`
- `tillsyn 1/3 8` Gör brynt smör — Spisplatta
- `väntan 20` Svalna
- `aktiv 5` Mixa äggvita, äggula och smör, salta
- `aktiv 3` Fyll sifonen, ladda 2 patroner
