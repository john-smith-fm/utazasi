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

1. Run migrations in order in the Supabase SQL Editor (or apply them with the Supabase CLI): `001_initial_schema.sql`, `002_fix_seed_permissions_and_conflict.sql`, then `003_add_trip_ownership_and_read_policies.sql`.
2. Set `SUPABASE_SECRET_KEY` locally for the seed process only. The importer also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` as a temporary compatibility fallback.
3. Run `npm run seed:supabase`. This command loads the local `.env.local` file; it does not expose its values to the browser.
4. Run `supabase/queries/verify_test_day.sql` in the SQL Editor. It must return six rows in time order.

The importer is idempotent: it upserts the trip by `slug`, the day by `(trip_id, date)`, and canonical activities by `seed_key`.

## RLS and magic-link access

Sprint 1B uses Supabase Auth magic links with PKCE. `003_add_trip_ownership_and_read_policies.sql` adds nullable `trips.user_id`, revokes authenticated writes, and creates `SELECT` policies that require `auth.uid()` to own the trip. The `days` and `timeline_activities` policies inherit access through their parent trip. There are no public `anon` policies, roles, sharing rules, or browser writes.

The browser client explicitly persists the Auth session in local storage, refreshes a valid session token, and restores it when the PWA opens. After the first successful magic-link login, the installed iPhone PWA reopens without another login for as long as the Supabase session remains valid. The small sign-out control in the Home Hero calls local-scope `supabase.auth.signOut()` and clears that persisted session even when offline.

The nullable column is a controlled migration path for the existing seed. Rows with no owner are invisible to all browser users. After creating the first family user, rerun the seed with the user's UUID:

```env
SUPABASE_SEED_USER_ID=<UUID from Supabase Auth > Users>
```

The server-side seed importer assigns this UUID to the seeded trip during its idempotent upsert. Only the service/secret key can perform this assignment.

## Home Timeline read integration

Home now performs read-only browser queries in this order: `trips` (by the seeded `sardinia-family-2026` slug), `days` (by the selected date), then `timeline_activities` (ordered by start time and creation time). The seeded 2026-09-03 day is the initial selection. Dates that have not been seeded continue to display their existing local content after the owner check succeeds.

The app is gated before any Home or fallback data renders. A signed-in user must first pass the trip ownership check. The successful owner check is cached on the device so an already-authorized installed PWA can continue to use its local fallback while offline.

For iPhone PWA testing:

1. In Supabase Auth URL Configuration, set the Site URL to the production Vercel URL and add both `https://utazasi-sable.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` as redirect URLs.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel for Production (and locally in `.env.local`). Never add secret/service-role values to Vercel client variables.
3. Deploy, request a magic link from the app, and complete it on the same iPhone/PWA.
4. Copy the new user's UUID from Supabase Auth > Users into local-only `SUPABASE_SEED_USER_ID`, then rerun `npm run seed:supabase` to assign the trip owner.
5. Reopen the PWA and verify that the 2026-09-03 Timeline contains six seed records.
6. Close and reopen the installed PWA: the Timeline should reopen without a new magic link. Then use the Home Hero sign-out control and verify that the magic-link screen returns.

After the intended family accounts exist, disable new-user signups in Supabase Auth if no additional users should be able to create accounts. Unknown authenticated users still cannot see any trip because of RLS.

## Canonical seed data and known uncertainty

`supabase/seeds/test-day.json` is transcribed only from the supplied Test Day Data package. That package gives the test date but not trip start/end dates; both are deliberately `null` rather than inferred from older prototype data.

Git JSON remains canonical knowledge. Supabase is the runtime projection. Future `places`, `events`, and `activity_ideas` tables are intentionally not in Sprint 1.
