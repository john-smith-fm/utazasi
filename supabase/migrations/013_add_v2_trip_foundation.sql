-- Utazási 2.0 foundation: minimal multi-Trip metadata and optimistic versions.
-- Existing Trip and Timeline rows remain valid; no legacy data is copied.

alter table public.trips
  add column if not exists timezone text not null default 'Europe/Budapest',
  add column if not exists status text not null default 'draft',
  add column if not exists version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

-- Preserve the correct legacy timezone without importing its Timeline.
update public.trips
set timezone = 'Europe/Rome',
    status = 'past'
where slug = 'sardinia-family-2026'
  and timezone = 'Europe/Budapest';

alter table public.trips
  drop constraint if exists trips_status_valid,
  add constraint trips_status_valid check (status in ('draft', 'upcoming', 'active', 'past', 'archived')),
  drop constraint if exists trips_version_positive,
  add constraint trips_version_positive check (version > 0);

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

alter table public.timeline_activities
  add column if not exists version integer not null default 1;

alter table public.timeline_activities
  drop constraint if exists timeline_activities_version_positive,
  add constraint timeline_activities_version_positive check (version > 0);

create index if not exists trips_status_dates_idx
  on public.trips (status, start_date, end_date);

comment on column public.trips.version is 'Optimistic concurrency version for Trip-level edits.';
comment on column public.timeline_activities.version is 'Optimistic concurrency version for Timeline edits.';
