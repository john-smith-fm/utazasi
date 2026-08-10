-- Utazási 1.0 / Event series and concrete daily event occurrences.
-- A multi-day festival is research context, not a Timeline item. Only a
-- concrete occurrence with a date, time and source belongs in public.events.

create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  canonical_key text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  organizer text,
  source_url text not null,
  place_slug text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_series_trip_canonical_key_unique unique (trip_id, canonical_key),
  constraint event_series_title_not_blank check (length(trim(title)) > 0),
  constraint event_series_source_url_not_blank check (length(trim(source_url)) > 0),
  constraint event_series_valid_date_range check (ends_at is null or ends_at >= starts_at)
);

create index if not exists event_series_trip_starts_at_idx
  on public.event_series (trip_id, starts_at);

drop trigger if exists event_series_set_updated_at on public.event_series;
create trigger event_series_set_updated_at
before update on public.event_series
for each row execute function public.set_updated_at();

alter table public.events
  add column if not exists series_id uuid references public.event_series(id) on delete set null;

create index if not exists events_series_id_idx
  on public.events (series_id)
  where series_id is not null;

alter table public.event_series enable row level security;

revoke all on public.event_series from anon;
revoke insert, update, delete on public.event_series from authenticated;
grant select on public.event_series to authenticated;
grant select, insert, update, delete on public.event_series to service_role;

drop policy if exists "Family members can read event series in their trips" on public.event_series;
create policy "Family members can read event series in their trips"
on public.event_series
for select
to authenticated
using (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = event_series.trip_id
      and trip_members.user_id = (select auth.uid())
  )
);

-- Correct the original InVaso seed: it is a multi-day festival, not one
-- scheduled program. The old event and its Watch state are intentionally
-- removed; no concrete daily occurrence has been verified yet.
insert into public.event_series (
  trip_id, canonical_key, title, starts_at, ends_at, organizer, source_url,
  place_slug, last_verified_at
)
select trip_id, canonical_key, title, starts_at, ends_at, organizer, source_url,
  place_slug, last_verified_at
from public.events
where canonical_key = 'event_invaso_festival_muravera_2026'
on conflict (trip_id, canonical_key) do update
set title = excluded.title,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    organizer = excluded.organizer,
    source_url = excluded.source_url,
    place_slug = excluded.place_slug,
    last_verified_at = excluded.last_verified_at;

delete from public.events
where canonical_key = 'event_invaso_festival_muravera_2026';
