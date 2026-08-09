# Place Coverage + Mobility — Audit

**Dátum:** 2026-08-10  
**Fázis:** Audit, csak olvasás  
**Állapot:** döntésre kész

## Hatókör és módszer

Az audit a kanonikus, jóváhagyott induló tervből készült:

- `knowledge/trip/timeline.initial.json` — 2026-09-02–13., 12 nap, 68 programpont;
- `knowledge/places/*.json` — 57 kanonikus Place rekord;
- `knowledge/mobility/routes.json` — jelenleg 0 jóváhagyott útvonal.

A környezet DNS-feloldási hibája miatt közvetlen, read-only production Supabase-lekérdezés nem volt elérhető. A vizsgálat ezért a productionbe már lefuttatott kanonikus seed forrásából készült. Nem használja a régi `src/data/home-days.ts` prototípusadatot.

Ez a dokumentum nem módosít Place-adatot, Timeline-t, Supabase-t vagy `routes.json`-t.

## Rövid eredmény

| Mutató | Eredmény |
| --- | ---: |
| Timeline napok | 12 |
| Kanonikus programpontok | 68 |
| Publikus kanonikus Place-hez kapcsolt programpontok | 13 |
| `trip-base`-hez kapcsolt programpontok | 13 |
| Érvénytelen vagy fel nem oldható `place_slug` | 0 |
| Meglévő, jóváhagyott Mobility route | 0 |

A Place-kapcsolati réteg tehát működik, de a Timeline-ban még csak hét publikus Place jelenik meg. A következő munka nem route-ok tömeges felvétele, hanem két konkrét Place-hiány és néhány nyitott program pontosítása.

## Timeline → Place coverage

| Dátum | Program / hely | Jelenlegi kapcsolat | Auditállapot |
| --- | --- | --- | --- |
| 09-02 | Érkezés, Autófelvétel — Cagliari Airport | `cagliari-airport` | lefedett |
| 09-02 | Szállás elfoglalása — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-02 | Repülő indulása — Budapest Airport | nincs slug | jogos szabad szöveg; nem szardíniai Mobility-végpont |
| 09-02 | Első séta — Villasimius | nincs slug | városnév, nem konkrét Place |
| 09-03 | Strand — Spiaggia di Porto Sa Ruxi | `porto-sa-ruxi` | lefedett |
| 09-03 | Ébredés, Enikő alszik, Pihenés — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-03 | Fagyi + séta — Villasimius | nincs slug | nyitott, konkrét hely még nincs kiválasztva |
| 09-04 | Strand — Spiaggia di Cala Pira | `cala-pira` | lefedett |
| 09-04 | Enikő alszik — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-05 | Strand — Spiaggia di Scoglio di Peppino | `scoglio-di-peppino` | lefedett |
| 09-05 | Pihenős délután, Séta — Villasimius | nincs slug | városnév, nem konkrét Place |
| 09-07 | Strand — Spiaggia di Porto Giunco | `porto-giunco` | lefedett |
| 09-07 | Enikő alszik — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-08 | Indulás, Enikő alszik — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-08 | Villaputzu roadtrip, Gyerekkönyvtár — Villaputzu | nincs slug | célhely/konkrét intézmény még nincs megnevezve |
| 09-09 | Strand — Spiaggia di Solanas | `solanas` | lefedett |
| 09-10 | Enikő alszik — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-10 | Strand — Spiaggia di Cala Pira | `cala-pira` | lefedett |
| 09-11 | Enikő alszik — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-11 | Fortezza Vecchia | `fortezza-vecchia` | lefedett |
| 09-11 | Kikötő / séta — Marina di Villasimius | nincs slug | új, konkrét Place-jelölt |
| 09-12 | Strand — Spiaggia di Porto Sa Ruxi | `porto-sa-ruxi` | lefedett |
| 09-12 | Enikő alszik, Pihenés / csomagolás — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-12 | Utolsó fagyi + séta — Villasimius | nincs slug | nyitott, konkrét hely még nincs kiválasztva |
| 09-13 | Check-out — Ollastu Apartments | `trip-base` | privát bázis, helyes |
| 09-13 | Strand, Ebéd, Zuhany + átöltözés — Poetto | nincs slug | új, konkrét Place-jelölt |
| 09-13 | Indulás a reptérre, Autóleadás, Repülő indulása — Cagliari Airport | `cagliari-airport` | lefedett |
| 09-13 | Érkezés — Budapest Airport | nincs slug | jogos szabad szöveg; nem szardíniai Mobility-végpont |

Az itt nem szereplő Timeline-elemeknek nincs helyszíne vagy még nyitott döntés: bevásárlás, étkezések, szabad strand, könnyű délután, nuraghe/helyi látnivaló, illetve több nyitott esti program. Ezekhez még nem szabad Place-kapcsolatot kitalálni.

## Létező kanonikus Place, de hiányzó kapcsolat

**Nincs egyértelmű, automatikusan javítható eset.**

Az adatbázisban vannak például Villaputzu-i kávézók, játszótér és több Villasimius-i fagylaltozó/étterem, de a Timeline csak települést vagy általános szándékot nevez meg. Ez nem elég egy Place automatikus hozzárendeléséhez.

Különösen nem kötendő automatikusan:

- `Tengerparti kávézó` → bármely kávézó;
- `Gyerekkönyvtár` → bármely Villaputzu-i hely;
- `Fagyi + séta` → `il-gelatone-villasimius`;
- `Bevásárlás` → `conad-city-villasimius`;
- `Nuraghe / helyi látnivaló` → `cuili-piras` vagy más sight.

Mindegyikhez emberi választás kell.

## Szükséges új Place rekordok

| Prioritás | Javasolt azonosító | Timeline használat | Mi hiányzik a jóváhagyáshoz |
| --- | --- | --- | --- |
| P0 | Poetto | 09-13: strand, ebéd, zuhany | jóváhagyott kanonikus rekord; konkrét belépési/parkolási vagy stabilimento-pont; ellenőrzött forrás; koordináta vagy navigációs cél |
| P0 | Marina di Villasimius | 09-11: kikötő / séta | jóváhagyott kanonikus rekord; hivatalos vagy ellenőrizhető forrás; pontos navigációs cél/koordináta |
| P1 | konkrét Villaputzu-i gyerekkönyvtár vagy programhely | 09-08: Gyerekkönyvtár | a tényleges intézmény neve és ellenőrzött helye |

`trip-base` nem kerül a publikus Place-adatba: ez szándékosan privát, alkalmazáson belüli mobility-origin.

## Jogos szabad szöveges helyek és nyitott szándékok

| Elem | Miért maradjon így most |
| --- | --- |
| Budapest Airport | repülési végpont, a Szardínia-helyismereti és autós Mobility scope-on kívül |
| Villasimius | település, nem konkrét célpont |
| Villaputzu | település, nem konkrét roadtrip-cél |
| Bevásárlás, ebéd, vacsora | a hely még nincs eldöntve |
| Tengerparti kávézó | nincs kiválasztott hely |
| Szabad strand | nincs kiválasztott strand |
| Nuraghe / helyi látnivaló | nincs kiválasztott látnivaló |
| Enikő alszik (09-05, 09-09) | a Timeline maga is helyzetfüggőnek jelöli |

## `trip-base`-hez kapcsolt programok

Jelenleg 13 helyes `trip-base` kapcsolat van:

- 09-02 Szállás elfoglalása;
- 09-03 Ébredés, Enikő alszik, Pihenés;
- 09-04 Enikő alszik;
- 09-07 Enikő alszik;
- 09-08 Indulás, Enikő alszik;
- 09-10 Enikő alszik;
- 09-11 Enikő alszik;
- 09-12 Enikő alszik, Pihenés / csomagolás;
- 09-13 Check-out.

Nincs további, egyértelműen `trip-base`-hez kapcsolandó elem: a 09-05 és 09-09 délutáni alvás helyzetfüggőnek van jelölve, ezért nem szabad feltételezésből átkötni.

## Mobility adatminőség

- `routes.json` szándékosan üres: nincs route, amelyhez menetidőt vagy távolságot lehetne kijelezni.
- A Timeline-ban használt hét publikus Place (`cagliari-airport`, `porto-sa-ruxi`, `cala-pira`, `scoglio-di-peppino`, `porto-giunco`, `solanas`, `fortezza-vecchia`) egyike sem tartalmaz jelenleg kanonikus `latitude` + `longitude` párt.
- A `trip-base` publikus cím és koordináta nélküli. Ez helyes adatvédelmi döntés, de a Mobility-becslésekhez később egy biztonságosan kezelt, nem Gitben tárolt origin szükséges.

A jelenlegi route-schema nem kényszerít koordinátát: ellenőrzött, irányított forrás-url és jóváhagyott km/perc kell. Ezért koordinátahiányt itt hiányként, nem automatikus adatgyártási feladatként kezelünk.

## Véges route-candidate lista

Minden sor tényleges Timeline-kapcsolatból származik. A lista nem tartalmaz km-t, percet vagy kitalált útvonalat.

| Prioritás | Innen | Ide | Timeline indok | Állapot |
| --- | --- | --- | --- | --- |
| P0 | `cagliari-airport` | `trip-base` | 09-02 érkezés és autófelvétel után szállás | Place végpont rendben; privát origin kell |
| P0 | `trip-base` | `porto-sa-ruxi` | 09-03 és 09-12 strand | két végpont azonosított |
| P1 | `porto-sa-ruxi` | `trip-base` | 09-03/09-12 napi visszatérés, ha így zárul a nap | irányított külön rekordként kezelendő |
| P0 | `trip-base` | `cala-pira` | 09-04 és 09-10 strand | két végpont azonosított |
| P1 | `cala-pira` | `trip-base` | 09-04/09-10 napi visszatérés, ha így zárul a nap | irányított külön rekordként kezelendő |
| P0 | `trip-base` | `scoglio-di-peppino` | 09-05 strand | két végpont azonosított |
| P0 | `trip-base` | `porto-giunco` | 09-07 strand | két végpont azonosított |
| P1 | `porto-giunco` | `trip-base` | 09-07: délutáni alvás a szálláson | ténylegesen szükséges átmenet |
| P0 | `trip-base` | `solanas` | 09-09 strand | két végpont azonosított |
| P0 | `trip-base` | `fortezza-vecchia` | 09-11: délutáni program | két végpont azonosított |
| BLOKKOLT | `fortezza-vecchia` | Marina di Villasimius | 09-11 közvetlen egymásután | Marina Place rekord hiányzik |
| BLOKKOLT | `trip-base` | Villaputzu-i konkrét cél | 09-08 roadtrip / gyerekprogram | konkrét célhely hiányzik |
| BLOKKOLT | `trip-base` | Poetto | 09-13 strand | Poetto Place rekord hiányzik |
| BLOKKOLT | Poetto | `cagliari-airport` | 09-13 reptéri indulás | Poetto Place rekord hiányzik |

Nem került a listába visszaút olyan napokon, ahol a Timeline további helye nyitott vagy helyzetfüggő. A Mobility nem töltheti ki ezeket feltételezéssel.

## Következő döntési pont

1. Jóváhagyni vagy pontosítani a két P0 Place rekordot: **Poetto** és **Marina di Villasimius**.
2. Dönteni a 09-08 konkrét Villaputzu-i gyerekprogramjáról.
3. A `trip-base` mobility-origin privát, runtime kezelését kijelölni.
4. Csak ezután gyűjteni és jóváhagyni a fenti, véges P0/P1 route-listához a forrásolt km/perc adatokat.
