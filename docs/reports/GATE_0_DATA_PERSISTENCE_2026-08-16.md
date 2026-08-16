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
- Notebook persisted-id contract — 4/4
- Question grounding suite — 40/40
- Production build — successful

## What has not been done

- No production Supabase data was seeded, migrated, updated, or deleted for this gate.
- No destructive test was run against family data.
- The gate still needs a separately approved, non-destructive runtime acceptance plan if server-side persistence must be verified again on the live family Trip.

## Ongoing rule

Do not seed, migrate, backfill, or delete runtime data that may contain a family edit until the operation is proven lossless and its exact scope is reviewed.
