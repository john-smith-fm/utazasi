# Watch and notification setup

The Watch foundation is server-only by default. It stores Event baselines,
material changes and device subscription records, but it does not send a push
notification until all of the following are deliberately configured.

1. Run `supabase/migrations/007_add_event_watch_and_push_foundation.sql` in the
   Supabase SQL Editor.
2. Generate VAPID keys and place the private key only in the server environment.
   The public key may use `NEXT_PUBLIC_VAPID_PUBLIC_KEY` once the explicit
   notification opt-in control is implemented.
3. Add a user-triggered notification permission action. Never prompt on page
   load, and treat unsupported or denied permission as a harmless in-app state.
4. Add the scheduled Event checker only after the small eligible Event set has
   an official source and an initial baseline.

The current `/api/watch` route is PIN-session-protected. Its `POST` endpoint
accepts an already-created browser Push subscription and stores it idempotently
by endpoint; it never accepts VAPID keys or sends a notification.
