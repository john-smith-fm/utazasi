# Supabase integration — PIN access

## Access model

Utazási is a private family PWA protected by one shared four-digit PIN. There is no user account, e-mail login, magic link, logout control, sharing UI, or browser-direct Supabase access.

```text
iPhone PWA
  ↓  PIN once per device
signed HttpOnly session cookie
  ↓
protected Next.js API route
  ↓
Supabase server-only secret key
  ↓
trips → days → timeline_activities
```

The cookie lasts 180 days. Clearing app/browser data, using a new device, or rotating `UTAZASI_SESSION_SECRET` requires entering the PIN again. There is intentionally no in-app logout.

## Environment

Copy `.env.local.example` to `.env.local`. Do not commit it.

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
UTAZASI_PIN_HASH=
UTAZASI_SESSION_SECRET=
```

For production, add the same variables in Vercel. They are all server-only except the Supabase URL. Never add a Supabase secret key, the PIN, its hash, or the session secret to a `NEXT_PUBLIC_*` variable.

The initial family PIN is configured in Vercel as a SHA-256 hash. Generate it locally without committing the PIN:

```bash
printf '%s' 'YOUR_PIN' | shasum -a 256
openssl rand -hex 32
```

The first command produces `UTAZASI_PIN_HASH`; the second produces `UTAZASI_SESSION_SECRET`.

## PIN protection

`POST /api/access/login` verifies the submitted four digits server-side using a timing-safe hash comparison, then writes an `HttpOnly`, `Secure` production cookie. It has an in-process five-failure / fifteen-minute rate limit per forwarded IP address. This is suitable for a small private family app; a future public deployment would need a shared rate-limit store.

After a successful online PIN check, the installed PWA stores only a local authorization marker for offline rendering. It never stores the PIN or the server cookie value in JavaScript-accessible storage.

## Timeline API

`GET /api/timeline?date=YYYY-MM-DD` verifies the signed session before querying Supabase with the server-only secret. The browser Timeline hook calls this API and keeps its existing local Home data as an offline/unfinished-day fallback.

## Existing migrations

Migrations `001` through `004` remain an accurate history of the initial Supabase setup. The `trip_members` table created during the earlier Auth experiment is inactive in the shared-PIN model and is deliberately retained rather than destructively removed.

## iPhone test

1. Open or install the PWA.
2. Set each PIN picker column and tap **Belépés**.
3. Verify the September 3 test day loads from Supabase.
4. Close and reopen the PWA: the PIN should not reappear while the session is valid.
5. Enable airplane mode and reopen: previously cached Home content may render after a prior successful login.
6. To revoke all devices, rotate both `UTAZASI_PIN_HASH` and `UTAZASI_SESSION_SECRET` in Vercel, then redeploy.
