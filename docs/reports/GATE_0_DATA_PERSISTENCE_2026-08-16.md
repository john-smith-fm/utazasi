# Release Gate 0 — Data Persistence

Date: 2026-08-16

## Purpose

Protect manually entered family data before further 1.0 development. Runtime Timeline and Notebook records are not disposable seed data.

## P0 fixes completed in code

1. **Legacy Timeline replacement retired.**
   - `--replace-test-day` now fails before any database configuration or request.
   - The `seed:supabase:replace-test-day` package command has been removed.
   - Normal `seed:supabase` remains insert-only for Timeline activities.
   - If legacy fixture rows are encountered, the normal seed stops and asks for an explicit reviewed maintenance plan; it never deletes them.
   - A normal seed writes the initial days and Timeline only for a newly created Trip. On any later run it does not recreate a family-deleted seeded activity or reset day metadata.

2. **Generic Place-link backfill retired.**
   - `backfill:place-links --apply` now fails before any database configuration or request.
   - The script is a read-only historical report without `--apply`.
   - Future corrections must happen through the app or an explicitly reviewed, record-level maintenance task.

3. **Historical Dashboard seed blocked.**
   - The generated and checked-in `replace-test-day.sql` files raise an error before executing their historical statements.
   - This prevents accidental use in the Supabase SQL editor.

## Automated verification

Passed locally on 2026-08-16:

- `npm run test:gate0` — 3/3
- Notebook persisted-id and legacy-import safety — 8/8
- Question grounding suite — 40/40
- Production build — successful

## What has not been done

- No production Supabase data was seeded, migrated, updated, or deleted for this gate.
- No destructive test was run against family data.
- The gate still needs a separately approved, non-destructive runtime acceptance plan if server-side persistence must be verified again on the live family Trip.

## Ongoing rule

Do not seed, migrate, backfill, or delete runtime data that may contain a family edit until the operation is proven lossless and its exact scope is reviewed.

## Persistence architecture audit

This section is a code-and-automated-test audit. It does **not** claim that
the live family Trip was modified or used as a destructive test fixture.

### Timeline

`HomePage` writes only through the PIN-protected `/api/timeline` routes. The
client waits for the server response before closing the editor, changing the
visible list, or showing a successful save message. The successful server
response is then re-read into the per-day browser cache; the cache is an
offline read copy, not the canonical source.

- Create, update and delete are scoped to the canonical Trip server-side.
- Delete happens on the server before the Undo UI is shown. Undo creates the
  deleted record again with an idempotency id and reports a failure honestly.
- Offline writes fail before a request is sent; an offline Timeline remains
  readable only from its last known cache.
- Ordinary `seed:supabase` now creates Timeline data only for a brand-new
  Trip. It never restores a subsequently deleted seed row, nor rewrites day
  metadata on an existing Trip.

### Notebook: Packing, Money, Notes and Journal

All four Notebook surfaces use the same `NotebookShell` mutation path:

```text
form / checkbox / edit / delete
  -> PIN-protected /api/notebook
  -> server-scoped Supabase write
  -> successful response
  -> local UI + cache update
```

- There is no optimistic success state: the list changes only after a 2xx
  server response.
- A client-side mutation lock serialises normal rapid taps. A failed request
  leaves the visible server-confirmed data unchanged and presents an error.
- The most recently fetched Notebook is cached only for offline reading.
  Offline writes are blocked with an explicit message; there is no offline
  mutation queue or later automatic sync.
- Create/update/delete endpoints scope every record id to the current Trip.
  An unknown or foreign id returns an error instead of modifying another row.

### Legacy browser import — P0 finding

The old localStorage migration has a safe *transport-level* retry design:
per-device migration keys and `(trip_id, legacy_source_id)` unique constraints
mean a failed retry does not duplicate its own imported rows. The completed
browser flag is written only after the migration endpoint returns success.

However, it currently has no semantic reconciliation step when the server
already contains manually created Notebook records from another device. In
that situation, an old local browser snapshot could be appended alongside the
newer server data and appear as a duplicate to the family.

**P0 repair implemented in code; runtime acceptance still required.** The
migration now reads the existing Notebook's `legacy_source_id` values first.
If it finds data that did not originate from this exact browser migration key,
it returns a non-destructive `409` instead of importing. The browser keeps its
local snapshot and does not mark the migration complete. A partial earlier
import from the same browser remains safe to retry. The future reviewed path
is an explicit merge/export decision, never an automatic overwrite.

## Seed and import safety matrix

| Process | Creates | May modify runtime data | Idempotent | User-data risk | Current status |
|---|---|---:|---:|---:|---|
| `seed:supabase` on a new Trip | Trip, 12 days, initial Timeline, canonical Events | No existing Trip writes | Yes | Low | Protected in code |
| `seed:supabase` on existing Trip | Missing canonical Events / Watch baselines only | No Timeline or day metadata writes | Yes | Low for Timeline; Event data is non-overwriting | Protected in code |
| Legacy `--replace-test-day` | Nothing | Previously deleted Timeline data | N/A | Critical | Retired; fails before DB access |
| Generic Place backfill `--apply` | Nothing | Previously could rewrite links | N/A | High | Retired; fails before DB access |
| Historical Dashboard replacement seed | Nothing | Historical SQL contains replacement statements | N/A | Critical | Blocked before execution |
| Notebook legacy import | Legacy Packing/Expense/Journal rows | Inserts only | Transport retry-safe | Automatic cross-device merge blocked | Code repair; device acceptance required |

## Schema and recovery observations

**Code verified**

- Runtime records use UUID primary keys and foreign keys to their Trip/Day.
- Notebook tables enforce title/content/date/type constraints and have
  `updated_at` triggers.
- Browser roles are revoked from Notebook writes; only the server-side
  service-role route performs mutations after PIN-session verification.
- `days -> trips`, `timeline_activities -> days`, and Notebook records -> Trip
  use `ON DELETE CASCADE`. This is correct relationally but makes deleting a
  Trip a destructive operation that must never be part of ordinary app or
  maintenance workflows.

**Human / Supabase Dashboard check required**

- Confirm migrations 001–012 are applied in the production project.
- Confirm the project backup/PITR availability, retention and restore
  procedure on the current Supabase plan.
- Do not attempt a restore against production as part of this acceptance.

## Read-only recovery snapshot

`npm run backup:runtime -- --output /full/path/outside-the-repository/utazasi-runtime-YYYY-MM-DD.json`

- Reads the canonical runtime Trip, Timeline, Notebook, Events and Push/Watch
  state through the server-only Supabase credential.
- Performs **no** insert, update, delete, seed, migration or restore.
- Refuses to write inside the Git repository, refuses to overwrite an existing
  file, and sets the created JSON file to owner-only permissions.
- The snapshot contains private family data. It must stay in an encrypted or
  otherwise protected local backup location and must never be committed,
  attached to an issue, or sent to an external service.
- A restore is intentionally not automated. It remains a separate,
  record-level, human-approved maintenance action: compare the snapshot to the
  current runtime data first, then restore only the reviewed records.

## Daily local backup — opt-in schedule

The project includes a macOS user-level, daily backup option. It is not
activated automatically: activation is a conscious, local-family decision.

- `npm run backup:schedule -- --install` installs a 03:30 daily LaunchAgent.
- It invokes the same read-only runtime snapshot script using `.env.local`.
- Default location: `~/Documents/Codex/Utazasi-backups`; the directory and
  created JSON snapshots are private to the macOS user.
- The schedule retains the most recent 14 days. It prunes only files matching
  its own `utazasi-runtime-*.json` pattern, and **only after** a successful new
  snapshot. A network/DNS failure therefore leaves every prior backup intact.
- `npm run backup:schedule -- --status` checks whether the schedule is active;
  `npm run backup:health` separately checks that a non-empty runtime snapshot
  exists and is no older than 30 hours. It is read-only and does not contact
  Supabase, so it can also expose a missed backup during a network outage.
  `--uninstall` disables future runs without deleting any snapshot.

This is a local recovery layer, not a replacement for a managed Supabase
backup/PITR policy. Restore remains deliberately manual and human-approved.

## Gate 1 handoff — PIN acceptance

The PIN server boundary has an automated regression suite (`npm run test:access`)
for valid/invalid PIN values and valid/tampered/expired sessions. It does not
replace the iPhone preview acceptance, which must still verify the visual keypad,
failed-attempt recovery, retry and offline reopening paths.

The private-trip-base payload is covered by `npm run test:trip-base`: without a
runtime origin it produces no address, and with a valid test origin it produces
only the intended name, address and navigation link. The API route retains its
PIN-session check before building that payload. A real-device preview must still
verify the complete protected request. The production environment variable
itself remains a manual Vercel configuration check and is never included in a
test or repository file.

## Acceptance matrix — evidence at this point

`CODE` means inspected; `AUTO` means local automated test; `DEVICE` requires
a deliberate iPhone/production acceptance without altering existing family
records.

| Module | Create | Update | Delete | Reload | Cache without server | Offline read | Offline write | Seed-safe |
|---|---|---|---|---|---|---|---|---|
| Timeline | CODE | CODE | CODE | DEVICE | CODE | CODE | CODE | AUTO + CODE |
| Packing | CODE + AUTO contract | CODE + AUTO contract | CODE + AUTO contract | DEVICE | CODE | CODE | CODE | N/A |
| Money | CODE + AUTO contract | CODE + AUTO contract | CODE + AUTO contract | DEVICE | CODE | CODE | CODE | N/A |
| Notes | CODE + AUTO contract | CODE + AUTO contract | CODE + AUTO contract | DEVICE | CODE | CODE | CODE | N/A |
| Journal | CODE + AUTO contract | CODE + AUTO contract | CODE + AUTO contract | DEVICE | CODE | CODE | CODE | N/A |

## Local evidence

Passed locally after the safety changes:

- Gate 0 safety tests: 3/3
- Notebook persisted-id and legacy-import safety: 8/8
- Question grounding tests: 40/40
- Production build: successful

No production Supabase mutation was used to obtain these results.
