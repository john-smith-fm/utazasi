# Destination Intelligence Enrichment v2.3 — build report

Build date: 2026-08-13  
Scope: current canonical Place/Event/Mobility/Research data, with deep research limited to Timeline P0 gaps  
Method: incremental P0 deep / P1 standard / P2 basic research; stable confirmed fields were not re-researched; work stopped when the current batch reached diminishing returns.

## Baseline audit

- 8 canonical Place files and 138 Place records were parsed.
- Category totals: 29 beaches, 36 restaurants, 16 cafes, 20 shops, 14 sights, 4 playgrounds, 7 parking records and 12 other records.
- 10 public Timeline P0 Places were identified, plus the private `trip-base` origin and Budapest Airport.
- Global Place slug and id uniqueness passed: no duplicate slug or id exists across the physical records.
- The alias layer contains 10 retired slugs which also remain in the source store. The runtime intentionally filters those records; the new validator reports this as a warning so the compatibility assumption stays visible.
- Baseline coverage: 3 Ready, 80 explicitly Partial, 55 other/legacy verification states; 7 records had coordinates; 3 had covers; none had supporting visuals or Street View provenance.
- Canonical Mobility has 0 approved routes. The runtime audit found 16 Timeline-supported route candidates, all correctly displayed as missing rather than estimated.
- Canonical daily Event count is 0. One confirmed 2026 event series (InVaso Festival) remains research context only.

The earlier 72-Place figure is obsolete for the checked-out repository. This build used the actual 138-record canonical source and did not rebuild it.

## Changed Place records

### Cala Pira — Partial

- Preserved all existing confirmed identity, coordinates, parking and access facts.
- Added a source-backed Wikimedia primary cover (`cover`) and a separate tower/surroundings supporting visual (`surroundings`).
- Marked both visuals as historical, including capture dates, attribution, licence, source URL and checked date.
- Explicitly limited the visual observation: the images support identity and landscape context, not current access, services or crowding.
- Family Intelligence remains Partial; WC, shower, stroller access, current parking tariff and trip-base route remain unknown.

### Scoglio di Peppino — Partial

- Preserved current fact/insight separation for beach character, services, family suitability and parking friction.
- Added a Wikimedia primary cover and functional `place_overview` visual with complete provenance.
- The 2006 image is stored as historical observation only. It does not raise the confidence of current service, access or crowding claims.
- Stroller path, current parking fee, current crowding and trip-base route remain unresolved.

### Marina di Villasimius — Partial

- Added official operator coordinates (39.116667, 9.512222).
- Confirmed continuous marina-area access, office hours 09:00–19:00, fuel 08:00–20:00, and water/toilet services from the current official operator page.
- Kept office/fuel hours separate from public-area access to avoid a false opening-hours fact.
- Added a Wikimedia cover and an aerial `map_context` supporting visual, both with capture date, attribution, licence and freshness limits.
- Basic, services, evidence and photo coverage are now Complete. Mobility and Family remain Partial; visitor parking details and the Fortezza–Marina walking duration remain unresolved.
- The record stays Partial so it remains visible to the P0 research queue.

No new Place was added in this batch. Only `beaches.json` and `sights.json` received new data versions (`2.3`).

## Fact / observation / insight handling

- Facts added: Marina coordinates, operator hours, continuous access and water/toilet services.
- Observations added: historical visual identity/context for Cala Pira, Scoglio di Peppino and Marina di Villasimius.
- Insights preserved: family suitability and friction statements remain interpretations with their existing confidence; no historical image was used to strengthen them.
- Changed evidence entries carry source reliability, evidence confidence and freshness independently.

## Facebook, Reddit and Street View

- No Facebook evidence was canonicalized. No sufficiently specific, public, source-stable P0 Facebook result was found in this batch.
- No new Reddit evidence was canonicalized. Search results were broad travel opinions and did not meet the deterministic evidence gate for a changed P0 field. Existing Reddit provenance elsewhere in the store remains explicit.
- No Street View evidence was canonicalized. Search-index results did not expose a capture date and stable panorama reference suitable for provenance. Access/stroller/parking observations therefore remain unknown rather than inferred.

## Relationships, corridor, Plan B, Mobility and Event intelligence

- Existing Fortezza Vecchia → Marina di Villasimius proximity remains a useful Place relationship, but the walking duration is still non-canonical.
- Marina now has stronger Plan B value as a short, continuously accessible waterfront walk with verified services; this remains an insight, not a guaranteed family facility claim.
- No corridor Place was added because the current batch prioritized unresolved Timeline P0 data over P1/P2 expansion.
- No Mobility route was added: private `trip-base` coordinates are intentionally unavailable publicly, and the Fortezza–Marina duration still lacks an approved route source.
- No daily Event was added. The official Villasimius 2026 calendar is a next-batch lead; a concrete event must still pass date, start-time, location and official-source gates before entering `events.json`.

## Validation

- JSON parsing: passed for all Place, Event and Mobility files.
- Global slug uniqueness: passed (138/138 unique).
- Global id uniqueness: passed (138/138 unique).
- Provenance and checked-date format: passed for changed records.
- Confidence/freshness vocabulary: passed.
- Cover/supporting image provenance: passed.
- Route provenance: passed (0 canonical routes; no invented values).
- Research unit tests: passed after strengthening the deterministic Timeline/P0 queue weight so a partially enriched P0 record cannot be displaced by deeper P1/P2 gaps.
- Grounding unit tests: passed.
- Production Next.js build: passed.
- Standalone `tsc --noEmit` still reports a pre-existing fixture error in `scripts/grounding/questioning.test.ts` where `HomeActivity.placeSlug` is absent; the production build succeeds.

## Unknown / stale data and next research batch

P0 deep, in order:

1. Porto Sa Ruxi: current access/parking rules, stroller evidence, WC/shower, cover plus access/parking visual.
2. Cala Pira: current parking tariff, WC/shower, stroller/access evidence and fresh Street View capture.
3. Scoglio di Peppino: exact parking/access path, stroller friction and fresh visual evidence.
4. Sam Beach Poetto: exact coordinates, 2026-09-13 operating/lunch confirmation and airport route.
5. Biblioteca Efisio Melis: 2026-09-08 exceptional opening, coordinates, stroller/parking and current family programming.
6. Fortezza Vecchia → Marina: source-backed walking route and parking context.
7. 2026-09-02–13 official Event sweep for Villasimius, Muravera, Villaputzu and Costa Rei.

P1 standard follows with corridor toilets, playgrounds, pharmacies, bakeries, fuel and rain/heat Plan B stops. P2 basic resumes only after these P0/P1 gaps stop producing material decision-support value.

## Future automated Research Provider note

This Desktop/Plus build used no separate API-cost budget. A future automated Research Provider may need explicit paid-source and API controls, but those controls did not limit this build.
