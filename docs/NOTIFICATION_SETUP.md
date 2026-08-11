# Watch and notification setup

The Watch foundation is server-only by default. It stores Event baselines,
material changes and device subscription records, but it does not send a push
notification until all of the following are deliberately configured.

1. Run `supabase/migrations/007_add_event_watch_and_push_foundation.sql` in the
   Supabase SQL Editor.
2. Run `npm run seed:supabase`. A canonical Event with an official source URL
   and `last_checked` value receives an initial Watch baseline automatically.
   Re-running the seed never overwrites an existing Watch state.
3. Generate VAPID keys and place the private key only in the server environment.
   Set `VAPID_SUBJECT` to a `mailto:` contact. The public key may use
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; the private key is `VAPID_PRIVATE_KEY`.
4. Add a user-triggered notification permission action. Never prompt on page
   load, and treat unsupported or denied permission as a harmless in-app state.
5. Add the scheduled Event checker only after the small eligible Event set has
   an official source and an initial baseline.

## Scheduled Watch setup

`POST /api/watch/run` is intentionally separate from the normal app APIs. It
requires a server-only `WATCH_RUNNER_SECRET`, processes at most
`WATCH_MAX_EVENTS_PER_RUN` Events (default 2, maximum 3), and only accepts
enabled Watch records with a recorded initial baseline. The runner constrains
OpenAI web search to each Event's approved source domain.

An accepted Event is considered only at the three travel-relevant checkpoints:
T−6 hours, T−2 hours and T−1 hour. A delayed scheduled pass catches up at the
latest passed checkpoint once. Failed checks may retry after 15 minutes, but
the system does not continuously poll an Event throughout the trip.

It writes material time, venue or status changes to `event_change_log` and
updates the Watch baseline. It never edits the Timeline, Event, Place JSON or
canonical data automatically. Connect this endpoint to the planned Supabase
scheduler only after a manual, cost-capped smoke test. The ready-to-run,
secret-free template is `supabase/queries/configure_watch_scheduler.sql`.

The scheduler has two jobs: `/api/watch/run` every 15 minutes and
`/api/watch/dispatch` two minutes later. The first job is still constrained by
the application-level T−6/T−2/T−1 checkpoint rule; the second only sends
already-recorded, material changes. The Vercel runner secret is copied once
into Supabase Vault, never into Git or a SQL migration.

Use `supabase/queries/verify_event_watch_foundation.sql` as the read-only
database check after migration and seed.

The current `/api/watch` route is PIN-session-protected. Its `POST` endpoint
accepts an already-created browser Push subscription and stores it idempotently
by endpoint; it never accepts VAPID keys or sends a notification.

`/api/watch/dispatch` is runner-secret-protected and sends only unnotified,
material Event changes. It revokes invalid endpoints and marks a change as
notified only after at least one device receives it. The Service Worker opens
the installed PWA when the family taps the notification.
