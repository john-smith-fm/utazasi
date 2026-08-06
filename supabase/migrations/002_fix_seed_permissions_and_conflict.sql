-- Follow-up to 001_initial_schema.sql.
-- `ON CONFLICT (seed_key)` requires a non-partial unique constraint/index.
-- PostgreSQL unique constraints allow multiple NULL values, so manually created
-- Timeline activities may continue to leave seed_key unset.

alter table public.timeline_activities
  drop constraint if exists timeline_activities_seed_key_unique;

drop index if exists public.timeline_activities_seed_key_unique;

alter table public.timeline_activities
  add constraint timeline_activities_seed_key_unique unique (seed_key);

-- The server-side seed importer uses a secret/service-role key. Keep its
-- database privileges explicit; the browser remains blocked by closed RLS.
grant usage on schema public to service_role;
grant usage on type public.timeline_activity_kind to service_role;
grant select, insert, update, delete on public.trips, public.days, public.timeline_activities to service_role;
