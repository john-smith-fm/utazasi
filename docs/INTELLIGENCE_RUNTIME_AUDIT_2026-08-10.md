# Intelligence Runtime Integration — Audit

**Dátum:** 2026-08-10  
**Fázis:** csak olvasás  
**Cél:** annak ellenőrzése, hogy a Kérdezési valóban használja-e a Shopping Intelligence SI-1 adatot.

## Ellenőrzött adatút

```text
StatRow
  → QuestionSheet
    → helyi answerFor() függvény
      → kiválasztott Timeline-nap
      → Weather snapshot
      → Trip Events
```

Jelenleg nincs:

- Kérdezési API endpoint;
- Shopping Intelligence import a kliens- vagy szerveroldali kérdéslogikában;
- `getPlaces()` lekérdezés a `QuestionSheet`-ben;
- `shopping-intelligence.json` import vagy hivatkozás a futásidejű kódban;
- strukturált Place-ajánlás vagy Place Detail link a válaszobjektumban.

## Forráskód-bizonyíték

- `src/components/StatRow.tsx` kizárólag `day`, `weather` és `events` értékeket ad át a `QuestionSheet`-nek.
- `src/components/QuestionSheet.tsx` `answerFor()` függvénye csak strand-, délután-, gyerek- és esemény-kulcsszavakat kezel.
- A válasz típusa csak `title`, `body`, `sources`; nincs benne `placeSlug`, ajánlási rang vagy óvatossági állapot.
- `knowledge/shopping-intelligence.json` kanonikus, de jelenleg nem része a Kérdezési runtime adatútjának.

## SI-1 tesztesetek

| Kérdés | Tényleges jelenlegi válaszút | SI-1 adatot használ? | Eredmény |
| --- | --- | --- | --- |
| „Hova menjünk nagybevásárolni érkezés után?” | általános fallback | nem | FAIL |
| „Hol tudunk gyorsan bevásárolni Villasimiusban?” | általános fallback | nem | FAIL |
| „Melyik bolt jó helyi termékekhez?” | általános fallback | nem | FAIL |

A fallback címe: **„Erre még nincs biztos válasz”**. Ez biztonságos — nem talál ki adatot —, de nem igazolja az Intelligence-réteg használatát.

## Elfogadási kritériumok állapota

| Kritérium | Állapot |
| --- | --- |
| Tényleg Shopping Intelligence-ből válaszol | FAIL |
| 2–3 releváns alternatívát ad | FAIL |
| Nem talál ki hiányzó adatot | PASS |
| A provisional következtetést óvatosan fogalmazza | N/A — nincs SI-válasz |
| Mobility hiányában nem mond menetidőt | PASS |
| Találatból Place Detail elérhető | FAIL |

## Következtetés

**Intelligence Runtime Integration jelenleg nincs kész.**

A Kérdezési biztonságos, szabályalapú prototípus, de a Shopping Intelligence SI-1 még csak kanonikus tudás, nem felhasználói döntéstámogatás. Emiatt Recommendation Card UI-t még nem szabad építeni: előbb a strukturált ajánlási adatút kell.

## Következő, szűk implementációs egység

### Shopping Intelligence Runtime Adapter

1. `knowledge/shopping-intelligence.json` beolvasása és validálása.
2. A rangsorolt `place_slug` értékek feloldása a meglévő `getPlaceBySlug()` segítségével.
3. A három SI-1 kérdés és közeli magyar megfogalmazásaik determinisztikus felismerése.
4. Strukturált válasz létrehozása:
   - cím;
   - rövid, forrásolt indoklás;
   - 2–3 feloldott Place;
   - `provisional` / `unknown` figyelmeztetés változtatás nélkül;
   - Mobility-adat hiányában sem km, sem perc.
5. Még **ne** épüljön új ajánlási kártya vagy UI: a meglévő Kérdezési szöveges válaszban ellenőrizzük az adatút helyességét.

Ha ez PASS, a következő fázis lehet az Intelligence Recommendation Card, amely a már strukturált Place-ajánlásokat jeleníti meg.
