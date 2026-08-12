# Contextual Place Picker — implementation audit

## Reused without structural change

- `ActivityEditor` already owns the Timeline `locationName` and `placeSlug` inputs,
  the searchable picker surface and Place-selection write path.
- `src/lib/places.ts` is the typed, validated access layer over the canonical
  versioned Place JSON files.
- `src/lib/shopping-intelligence.ts` already contains approved, deterministic
  shopping decision profiles and candidate ordering.
- The Timeline API already persists both free text (`location_name`) and a
  canonical relation (`place_slug`).

## Integration point

Contextual selection belongs immediately above the existing name-search results
inside the `ActivityEditor` location picker. It is an additional entry path:

`Timeline title → deterministic intent → canonical candidates → existing selectPlace`

The existing name search and free-text input remain unchanged. Selecting a
recommendation uses the same `selectPlace` function as search results.

## Data model impact

No Place schema change and no Supabase migration are required. Suggestions use
only canonical Place data, existing Shopping Intelligence profiles and the
existing `place_slug` field. No recommendation writes to the Timeline until the
family explicitly selects it and saves the editor.

## Ranking evidence currently available

- Shopping: approved `arrival_shopping`, `daily_groceries`, `quick_stop` and
  `local_products` profiles provide candidate order and, when available, a
  source-backed rationale.
- Beach, restaurant, cafe, playground and sight: the canonical Place type and
  locality are sufficient for a grounded category suggestion. The selector
  prefers the trip destination locality (`Villasimius`) but does not claim that
  an item is nearest, fastest or open.

## Deliberate limits

- No route distance, duration, stock level, opening-hours claim or family claim
  is invented.
- `baby_products = unknown` produces a transparent no-recommendation state.
- The current editor does not receive a rich selected-day object. The selected
  day remains the Timeline save context; candidate ranking uses the trip region
  and canonical Place coverage only. A future day-specific preference can be
  added without changing the picker data model.
