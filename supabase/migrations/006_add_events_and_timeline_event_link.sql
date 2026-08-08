-- Utazási 1.0 / Event runtime foundation.
-- Events are time-varying programs. They are intentionally separate from the
-- canonical Place JSON catalogue and can optionally reference a Place slug.

do $$
begin
  create type public.event_status as enum ('scheduled', 'changed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  canonical_key text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  organizer text,
  source_url text not null,
  status public.event_status not null default 'scheduled',
  place_slug text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_trip_canonical_key_unique unique (trip_id, canonical_key),
  constraint events_title_not_blank check (length(trim(title)) > 0),
  constraint events_source_url_not_blank check (length(trim(source_url)) > 0),
  constraint events_valid_date_range check (ends_at is null or ends_at >= starts_at)
);

create index if not exists events_trip_starts_at_idx on public.events (trip_id, starts_at);
create index if not exists events_trip_status_idx on public.events (trip_id, status);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.timeline_activities
  add column if not exists source_event_id uuid references public.events(id) on delete set null;

create index if not exists timeline_activities_source_event_id_idx
  on public.timeline_activities (source_event_id)
  where source_event_id is not null;

alter table public.events enable row level security;

revoke all on public.events from anon;
revoke insert, update, delete on public.events from authenticated;
grant select on public.events to authenticated;
grant usage on type public.event_status to authenticated, service_role;
grant select, insert, update, delete on public.events to service_role;

drop policy if exists "Family members can read events in their trips" on public.events;
create policy "Family members can read events in their trips"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = events.trip_id
      and trip_members.user_id = (select auth.uid())
  )
);
