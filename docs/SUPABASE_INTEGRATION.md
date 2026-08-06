# Supabase integration — Sprint 1C

## Purpose

Supabase is the private runtime data store for Utazási. Git/JSON remains the canonical knowledge source. Browser clients may read only the itinerary of trips for which they have a family membership.

Sprint 1C adds two things:

- `trip_members`: owner/member membership records and membership-based RLS;
- e-mail OTP authentication completed inside the installed PWA, rather than a Safari magic-link callback.

## Environment

Copy `.env.local.example` to `.env.local` locally. Do not commit this file.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_FAMILY_MEMBERS=owner@example.com:owner,member@example.com:member
SUPABASE_TRIP_SLUG=sardinia-family-2026
```

Only the two `NEXT_PUBLIC_*` values belong in Vercel. `SUPABASE_SECRET_KEY`, legacy `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_FAMILY_MEMBERS` remain local-only values. Never expose them in browser code, Git, or Vercel client variables.

## Apply the migration

Run migrations in order in the Supabase SQL Editor or with the Supabase CLI:

1. `001_initial_schema.sql`
2. `002_fix_seed_permissions_and_conflict.sql`
3. `003_add_trip_ownership_and_read_policies.sql`
4. `004_add_family_members_and_otp_access.sql`

Migration `004` preserves any existing `trips.user_id` owner as an `owner` membership, then replaces the read policies with membership-based policies. It does not grant browser writes.

## Seed and provision family members

First project data, then provision the invite-only family identities:

```bash
npm run seed:supabase
npm run provision:family
```

`provision:family` is idempotent. It reads the local `SUPABASE_FAMILY_MEMBERS` value, creates confirmed Supabase Auth users when they do not already exist, then upserts their `trip_members` rows. Exactly one `owner` is required by the script. This is deliberately a private admin/seed operation; there is no invitation-management UI in Sprint 1C.

## Configure e-mail OTP in Supabase

The code-entry UI requires an OTP e-mail template.

The default Supabase mail sender does not permit editing this template. Configure a custom SMTP provider first, then:

1. In **Supabase Dashboard → Authentication → Email Templates**, open **Magic link or OTP**.
2. Change the message body to use `{{ .Token }}` rather than `{{ .ConfirmationURL }}`.
3. Keep a short expiration period and save the template.
4. Do not use the old `/auth/callback` URL as an OTP redirect target. It remains only as a human-readable fallback for old e-mails.

The PWA calls `signInWithOtp` with `shouldCreateUser: false`, then verifies the entered code with `verifyOtp`. A previously unknown e-mail cannot create a user through the app. The Auth users are instead created by `npm run provision:family`.

Do not deploy the OTP UI before this SMTP/template step is complete: the default Magic Link template would otherwise send a link instead of a code.

## RLS model

```text
auth.uid()
  ↓
trip_members.user_id
  ↓
trip_members.trip_id
  ↓
trips / days / timeline_activities
```

Authenticated users can read only their own membership and the trip, days, and activities connected to it. `anon` receives no table access. Browser clients have no insert, update, or delete grants.

## iPhone PWA test

1. Install or open Utazási on the iPhone.
2. Enter a provisioned family e-mail address.
3. Copy the e-mail OTP into the same PWA; Safari is not part of this flow.
4. Verify that the 2026-09-03 Timeline has six activities.
5. Close and reopen the PWA. A valid persisted session should restore automatically.
6. Turn on airplane mode and reopen while the session remains valid. The last authorized local Home fallback may render.
7. Use the Home Hero logout button. The Timeline must no longer be available.
8. Confirm that an e-mail absent from `SUPABASE_FAMILY_MEMBERS` cannot create an Auth user or see the trip.

## Read-only verification query

Run [verify_test_day.sql](../supabase/queries/verify_test_day.sql) after seeding. Then inspect the members without exposing any secret:

```sql
select
  trips.slug,
  trip_members.email,
  trip_members.role,
  trip_members.accepted_at
from public.trip_members
join public.trips on trips.id = trip_members.trip_id
where trips.slug = 'sardinia-family-2026'
order by trip_members.role, trip_members.email;
```

The SQL Editor runs as an administrative role. RLS validation must be done through the installed PWA, using each provisioned user.
