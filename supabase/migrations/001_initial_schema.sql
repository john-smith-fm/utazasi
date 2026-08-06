-- Utazási Sprint 1: runtime trip, day and Timeline data only.
-- Git/JSON remains the canonical knowledge source; places/events/ideas come later.

create extension if not exists pgcrypto;

create type public.timeline_activity_kind as enum ('plan', 'travel');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  destination text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint trips_valid_date_range check (end_date is null or start_date is null or end_date >= start_date),
  constraint trips_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  title text not null,
  subtitle text,
  created_at timestamptz not null default now(),
  constraint days_trip_date_unique unique (trip_id, date)
);

create table public.timeline_activities (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days(id) on delete cascade,
  start_time time not null,
  duration_minutes integer not null,
  title text not null,
  description text,
  location_name text,
  kind public.timeline_activity_kind not null default 'plan',
  is_system_generated boolean not null default false,
  -- Stable Git/JSON importer key. User-created activities leave this null.
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_activities_duration_positive check (duration_minutes > 0)
);

create unique index timeline_activities_seed_key_unique
  on public.timeline_activities (seed_key)
  where seed_key is not null;
create index days_trip_id_date_idx on public.days (trip_id, date);
create index timeline_activities_day_time_created_idx
  on public.timeline_activities (day_id, start_time, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger timeline_activities_set_updated_at
before update on public.timeline_activities
for each row execute function public.set_updated_at();

-- RLS is deliberately closed until a family access/auth mechanism is approved.
alter table public.trips enable row level security;
alter table public.days enable row level security;
alter table public.timeline_activities enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.trips, public.days, public.timeline_activities to authenticated;

-- No permissive RLS policies are intentionally created in Sprint 1.
-- Open anon policies would expose a private family itinerary on the public URL.
