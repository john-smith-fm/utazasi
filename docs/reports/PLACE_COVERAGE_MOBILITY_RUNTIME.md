# Place Coverage + Mobility runtime audit

Generated: 2026-08-12T21:44:24.122Z

Read-only audit of the Timeline, canonical Git Place JSON and approved `knowledge/mobility/routes.json`. It creates no Place, Timeline or Mobility data and never estimates km or minutes.

## Scope summary

- Timeline source: **canonical initial Timeline fallback**
- Trip: **Kanonikus induló terv** (`sardinia-family-2026`)
- Days: **12**
- Runtime fallback reason: `TypeError: fetch failed`

- Timeline activities: **68**
- Canonically linked public Places: **11**
- Trip-base activities: **13**
- Free-text location groups: **2**
- Invalid or missing Place slugs: **0**
- Route candidates: **16** (0 approved, 16 still missing)

## Timeline → canonical Place coverage

| Place | Slug | Type | Timeline evidence |
| --- | --- | --- | --- |
| Biblioteca Comunale Efisio Melis | `biblioteca-comunale-efisio-melis` | other | 2026-09-08 10:30 · Gyerekkönyvtár |
| Budapest Airport | `budapest-airport` | other | 2026-09-02 10:35 · Repülő indulása<br>2026-09-13 19:35 · Érkezés |
| Cagliari Elmas Airport (CAG) | `cagliari-airport` | other | 2026-09-02 12:45 · Érkezés<br>2026-09-02 13:00 · Autófelvétel<br>2026-09-13 15:00 · Indulás a reptérre<br>2026-09-13 16:00 · Autóleadás<br>2026-09-13 17:30 · Repülő indulása |
| Fortezza Vecchia | `fortezza-vecchia` | sight | 2026-09-11 16:00 · Fortezza Vecchia |
| Marina di Villasimius | `marina-di-villasimius` | sight | 2026-09-11 17:30 · Kikötő / séta |
| Sam Beach — Poetto | `sam-beach-poetto` | beach | 2026-09-13 11:00 · Strand<br>2026-09-13 13:00 · Ebéd<br>2026-09-13 14:30 · Zuhany + átöltözés |
| Spiaggia di Cala Pira | `cala-pira` | beach | 2026-09-04 09:00 · Strand<br>2026-09-10 16:00 · Strand |
| Spiaggia di Porto Giunco | `porto-giunco` | beach | 2026-09-07 09:00 · Strand |
| Spiaggia di Porto Sa Ruxi | `porto-sa-ruxi` | beach | 2026-09-03 09:00 · Strand<br>2026-09-12 09:00 · Strand |
| Spiaggia di Scoglio di Peppino | `scoglio-di-peppino` | beach | 2026-09-05 09:00 · Strand |
| Spiaggia di Solanas | `solanas` | beach | 2026-09-09 09:00 · Strand |

## Trip-base-linked programs

`trip-base` is the private accommodation/mobility origin. It is intentionally not a public Place record.

| Program | Timeline evidence |
| --- | --- |
| Check-out | 2026-09-13 10:00 · Check-out |
| Ébredés | 2026-09-03 06:45 · Ébredés |
| Enikő alszik | 2026-09-03 13:00 · Enikő alszik<br>2026-09-04 13:00 · Enikő alszik<br>2026-09-07 13:00 · Enikő alszik<br>2026-09-08 13:00 · Enikő alszik<br>2026-09-10 13:00 · Enikő alszik<br>2026-09-11 13:00 · Enikő alszik<br>2026-09-12 13:00 · Enikő alszik |
| Indulás | 2026-09-08 08:30 · Indulás |
| Pihenés | 2026-09-03 15:30 · Pihenés |
| Pihenés / csomagolás | 2026-09-12 15:30 · Pihenés / csomagolás |
| Szállás elfoglalása | 2026-09-02 15:00 · Szállás elfoglalása |

## Free-text locations

These remain free text unless someone explicitly approves a Place link. An exact name match is only a review hint; the audit never creates a link.

| Location | Exact canonical-name match | Timeline evidence |
| --- | --- | --- |
| Villaputzu | — | 2026-09-08 10:30 · Villaputzu roadtrip |
| Villasimius | — | 2026-09-02 18:00 · Első séta<br>2026-09-03 17:30 · Fagyi + séta<br>2026-09-05 16:00 · Pihenős délután<br>2026-09-05 18:30 · Séta<br>2026-09-12 17:30 · Utolsó fagyi + séta |

## Missing or invalid Place links

| Requested slug | Timeline evidence |
| --- | --- |
| None | — |

## Finite Mobility route candidates

Only routes evidenced by the current runtime Timeline are listed. `approved` means an explicit, source-backed record exists in `routes.json`; `missing` means the app must show no km/min estimate.

| Priority | From | To | Reason | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | `cagliari-airport` | `trip-base` | reptér ↔ szállás | 2026-09-02 15:00 · Szállás elfoglalása<br>2026-09-02 · Érkezés + szállás elfoglalása | missing · no estimate |
| P0 | `trip-base` | `cagliari-airport` | reptér ↔ szállás (hazautazási kapcsolat) | 2026-09-13 · Check-out + repülő indulása | missing · no estimate |
| P1 | `biblioteca-comunale-efisio-melis` | `trip-base` | Timeline-helyváltás | 2026-09-08 13:00 · Enikő alszik | missing · no estimate |
| P1 | `cala-pira` | `trip-base` | Timeline-helyváltás | 2026-09-04 13:00 · Enikő alszik | missing · no estimate |
| P1 | `fortezza-vecchia` | `marina-di-villasimius` | Timeline-helyváltás | 2026-09-11 17:30 · Kikötő / séta | missing · no estimate |
| P1 | `porto-giunco` | `trip-base` | Timeline-helyváltás | 2026-09-07 13:00 · Enikő alszik | missing · no estimate |
| P1 | `porto-sa-ruxi` | `trip-base` | Timeline-helyváltás | 2026-09-03 13:00 · Enikő alszik<br>2026-09-12 13:00 · Enikő alszik | missing · no estimate |
| P1 | `sam-beach-poetto` | `cagliari-airport` | Timeline-helyváltás | 2026-09-13 15:00 · Indulás a reptérre | missing · no estimate |
| P1 | `trip-base` | `biblioteca-comunale-efisio-melis` | ismert hely egy nyitott program után | 2026-09-08 10:30 · Gyerekkönyvtár | missing · no estimate |
| P1 | `trip-base` | `cala-pira` | Timeline-helyváltás | 2026-09-04 09:00 · Strand<br>2026-09-10 16:00 · Strand | missing · no estimate |
| P1 | `trip-base` | `fortezza-vecchia` | Timeline-helyváltás | 2026-09-11 16:00 · Fortezza Vecchia | missing · no estimate |
| P1 | `trip-base` | `porto-giunco` | Timeline-helyváltás | 2026-09-07 09:00 · Strand | missing · no estimate |
| P1 | `trip-base` | `porto-sa-ruxi` | Timeline-helyváltás | 2026-09-03 09:00 · Strand<br>2026-09-12 09:00 · Strand | missing · no estimate |
| P1 | `trip-base` | `sam-beach-poetto` | Timeline-helyváltás | 2026-09-13 11:00 · Strand | missing · no estimate |
| P1 | `trip-base` | `scoglio-di-peppino` | Timeline-helyváltás | 2026-09-05 09:00 · Strand | missing · no estimate |
| P1 | `trip-base` | `solanas` | Timeline-helyváltás | 2026-09-09 09:00 · Strand | missing · no estimate |

## Safe next actions

1. Review only the `missing` candidates that are actually useful for the trip.
2. Add a route only after a human approves a source-backed direction, km and duration in `knowledge/mobility/routes.json`.
3. Re-run this audit after any canonical Place change, runtime Timeline change or approved route update.
4. Do not turn free text or exact-name hints into Place links without explicit approval.

