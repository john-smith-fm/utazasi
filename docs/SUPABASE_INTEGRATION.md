# Supabase integration — Sprint 1

## Scope

This change is infrastructure only. The existing Home UI continues to use local data until a separately approved data-read integration.

## Environment

Copy `.env.local.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The browser client uses only these values. Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser, Git, or Vercel client environment.

## Apply and seed

1. Run migrations in order in the Supabase SQL Editor (or apply them with the Supabase CLI): first `001_initial_schema.sql`, then `002_fix_seed_permissions_and_conflict.sql`.
2. Set `SUPABASE_SECRET_KEY` locally for the seed process only. The importer also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` as a temporary compatibility fallback.
3. Run `npm run seed:supabase`. This command loads the local `.env.local` file; it does not expose its values to the browser.
4. Run `supabase/queries/verify_test_day.sql` in the SQL Editor. It must return six rows in time order.

The importer is idempotent: it upserts the trip by `slug`, the day by `(trip_id, date)`, and canonical activities by `seed_key`.

## RLS and auth status

RLS is enabled and no permissive policies exist yet. This intentionally prevents public browser reads and writes while the family access/auth mechanism is unresolved. The seed script is server-side and bypasses RLS through a Supabase secret key (or the legacy service-role key).

## Home Timeline read integration

Home now performs read-only browser queries in this order: `trips` (by the seeded `sardinia-family-2026` slug), `days` (by the selected date), then `timeline_activities` (ordered by start time and creation time). The seeded 2026-09-03 day is the initial selection. Dates that have not been seeded continue to display their existing local content.

The read integration requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Vercel environment. It also requires an explicitly approved RLS `SELECT` policy. The current versioned migrations do not include one, so the browser will retain its local fallback until the family access policy is decided. No browser write is performed.

Before connecting the Home UI, choose and implement one of:

- Supabase Auth; or
- a server-verified family PIN that issues a restricted session.

Do not add open `anon` policies for a private family itinerary.

## Canonical seed data and known uncertainty

`supabase/seeds/test-day.json` is transcribed only from the supplied Test Day Data package. That package gives the test date but not trip start/end dates; both are deliberately `null` rather than inferred from older prototype data.

Git JSON remains canonical knowledge. Supabase is the runtime projection. Future `places`, `events`, and `activity_ideas` tables are intentionally not in Sprint 1.
