# Utazási 1.0 — implementation backlog

## Product boundary

Utazási 1.0 is a single, predefined family trip. It extends the accepted Timeline, Place, canonical JSON, PWA and PIN-protected runtime; it does not redesign them.

The intended chain is:

```text
Timeline plan → daily context → selected official Event watch → relevant change → in-app status / optional push
```

`knowledge/places/*.json` remains the single canonical place knowledge source. Facts, evidence and insights are reasoning layers, not a second Place schema.

## Subscription and service decisions

| Service | Purpose | When it is needed | Decision |
| --- | --- | --- | --- |
| OpenAI API | limited web research for Event Watch | Epic 7 | User activates API billing for the existing project, sets a small initial budget, and adds `OPENAI_API_KEY` only as a server secret. Web search is billed per call in addition to model use. |
| Open-Meteo | current weather and forecast | Epic 2 | No subscription for the private, non-commercial 1.0 use. Cache server-side and display attribution. Re-evaluate its commercial plan only if the app becomes commercial. |
| Google Maps URLs | hand off navigation | Epic 3 | No API key or subscription. Use encoded `https://www.google.com/maps/...?...&api=1` links only. |
| Supabase | runtime data, scheduling and secrets | Epics 1, 6, 7 | Reuse the existing project. Use `pg_cron` + `pg_net` + an Edge Function only when scheduled Watch checks begin; secrets belong in Supabase Vault. |
| Web Push | important change notifications | Epic 6 | No third-party notification subscription. Use standards-based Push API, VAPID keys, Service Worker and persisted device subscriptions. |
| Vercel | existing app hosting | all | No new service is required. Do not add Vercel Cron while Supabase scheduling covers the Watch job. |

Never commit secrets, booking references, vouchers or API keys. The `utazasi_data_codex_v1.4` `trip.json` contains private booking information and may only be imported after a redacted, public-safe projection is prepared.

## Epic 0 — Canonical 1.0 directives

**Goal:** import the public-safe architecture directives from data package v1.4 without overwriting current canonical Place data.

- Add canonical Event, Watch, Weather Context, Smart Status, Question UI and AI-rule specifications.
- Keep the existing richer `knowledge/places/*.json` files unchanged.
- Create a redacted Trip projection if trip metadata is needed in Git.
- Do not import booking codes, rental reservations or vouchers.

**Acceptance:** no secrets enter Git; Event remains separate from Place; current Place slug counts do not decrease.

## Epic 1 — Event runtime foundation

**Goal:** represent an externally changeable program without changing the meaning of normal Timeline items.

- Add versioned Supabase migration for `events`.
- Add nullable `source_event_id` to `timeline_activities`.
- Keep existing Timeline `plan | travel` behaviour; an Event-linked plan remains a normal scheduled plan with additional external context.
- Add validated server-side Event read path and seed only the approved in-trip Event data.
- Do not create Event CRUD, automatic imports or public client writes.

**Acceptance:** an Event can be linked to a Timeline item and optionally to a canonical `place_slug`; ordinary plans and travel blocks behave exactly as today.

## Epic 2 — Weather Context

**Goal:** replace display-only weather with a cached, selected-day context input.

- Server-side Open-Meteo adapter with a single Villasimius forecast location initially.
- Cache responses with a documented TTL; offline UI keeps the last successful snapshot.
- Return temperature, precipitation state and wind only.
- Add required attribution and error / stale-data state.

**Acceptance:** no weather key in the client; repeated app openings do not repeatedly call the provider; the current Weather Bar design is preserved.

## Epic 3 — Mobility and Google Maps hand-off

**Goal:** help the family judge travel feasibility without building navigation.

- Add canonical, sourceable `knowledge/mobility/routes.json` for a small approved set of route estimates.
- Use Place slugs, travel mode, distance, estimated minutes, source and checked date.
- Reuse existing Maps URLs for Place and Timeline navigation hand-off.
- Do not add a routing API, live location tracking or a map screen.

**Acceptance:** a route estimate is never invented; Google Maps links open correctly on iPhone; missing routes remain explicitly unavailable.

## Epic 4 — Smart Status v1

**Goal:** make Home explain the current selected day through deterministic priority rules.

Priority:

1. critical Event change;
2. next selected-day program;
3. weather warning;
4. calm selected-day summary.

**Acceptance:** no AI call is needed; another day never leaks into the status; loading, stale weather and empty day have deliberate copy.

## Epic 5 — Kérdezési fixture experience

**Goal:** validate the decision-help interaction without becoming a chatbot.

- Add the Weather Bar entry point and an iPhone-first question surface.
- Match a small, explicit set of question intents to Timeline, Place, Weather and Mobility data.
- Return concise, explainable answers and a clear unsupported state.
- No free-form AI conversation and no AI Timeline write.

**Acceptance:** the three defined questions work with fixtures and show their data basis; the component does not change the existing Home visual system.

## Epic 6 — Watch state, change log and push foundation

**Goal:** persist watchable Event state and let an installed PWA opt into important-change delivery.

- Add `event_watch_states`, `event_change_log` and device push-subscription storage with server-only mutation paths.
- An Event is eligible automatically only when it has an official source URL and an initial checked state.
- Add an explicit, user-gesture notification-permission action; never prompt on page load.
- Service Worker receives and displays only visible, important notifications.

**Acceptance:** duplicate subscriptions are idempotent; unsupported browsers retain in-app status; denied permission is harmless; a test notification reaches an installed iPhone PWA only after consent.

## Epic 7 — Scheduled Research Watch and deterministic change detection

**Goal:** periodically check the small eligible Event set and notify only material differences.

- Deploy a server-only scheduled worker through Supabase Edge Functions and `pg_cron` / `pg_net`.
- Use the existing constrained Research Provider only for active Watch records.
- Apply per-run event, source and cost limits; log failure without notifying the user.
- Compare normalized event status, start time and venue only.
- Emit a single idempotent change record for cancellation, time change or venue change; ignore minor text changes.

**Acceptance:** no arbitrary URL proxy; no canonical Place or Timeline data is auto-edited; repeated checks do not create duplicate changes or pushes.

## Epic 8 — 1.0 release acceptance

**Goal:** prove the companion loop on the actual iPhone PWA.

- iPhone Home Screen PWA: offline Timeline read, Weather stale state, Place-to-Maps hand-off, Smart Status and Kérdezési fixture.
- Watch fixture: baseline → time change → in-app status → one push → Timeline target.
- Verify PIN/session persistence, safe areas and no visible failed write.
- Record only a private, optional daily feedback note; do not add third-party analytics first.

**Release gate:** all Core, selected context functions and one end-to-end Watch notification work on the family iPhone before the trip.

## Non-goals for 1.0

- multi-trip or member management;
- sharing and role permissions;
- full chat interface or autonomous planning;
- automatic Timeline rearrangement;
- live routing, map rendering or location tracking;
- watching every Place, restaurant or beach.
