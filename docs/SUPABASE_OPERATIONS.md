# Supabase operations

The repository uses versioned SQL migrations in `supabase/migrations`.
The optional `utazasi-v2-poc` seed is never loaded automatically.

## Required secrets

Keep these values outside Git and local tracked files:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

For GitHub Actions, add them as encrypted repository secrets.

## First connection to the existing production project

The production schema predates the CLI workflow, so never start with a blind
`db push`. First link the project and compare local and remote history:

```bash
npm run supabase:migrations
npm run supabase:dry-run
```

If versions `001` through `012` are missing from remote migration history while
their schema objects already exist, reconcile the history before applying new
migrations. Do not re-run migration `001` over the existing schema.

## Routine deployment

1. Run `npm run supabase:migrations`.
2. Run `npm run supabase:dry-run` and review the exact pending versions.
3. Run `npm run supabase:push` only after the preview is correct.
4. Run `npm run supabase:seed:v2` only when the isolated POC Trip is wanted.
5. Run `npm run supabase:verify:v2` after the POC seed.

The GitHub workflow `Supabase production migration` follows the same order. Its
default run is preview-only. Applying migrations and loading the POC seed are
separate, explicit switches.
