-- Utazási 1.0 / Watch + notification foundation.
-- This migration only stores watched Event baselines, material changes and
-- device subscriptions. Scheduled research and actual Web Push delivery stay
-- separate follow-up steps.

do $$
begin
  create type public.event_change_kind as enum ('status_changed', 'start_time_changed', 'venue_changed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.event_watch_states (
  event_id uuid primary key references public.events(id) on delete cascade,
  enabled boolean not null default false,
  baseline_status public.event_status,
  baseline_starts_at timestamptz,
  baseline_place_slug text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_change_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  change_kind public.event_change_kind not null,
  change_fingerprint text not null unique,
  previous_snapshot jsonb not null,
  next_snapshot jsonb not null,
  observed_at timestamptz not null default now(),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_change_log_fingerprint_not_blank check (length(trim(change_fingerprint)) > 0)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_is_https check (endpoint like 'https://%')
);

create index if not exists event_watch_states_enabled_idx
  on public.event_watch_states (enabled) where enabled;
create index if not exists event_change_log_event_observed_idx
  on public.event_change_log (event_id, observed_at desc);
create index if not exists event_change_log_unnotified_idx
  on public.event_change_log (observed_at desc) where notified_at is null;
create index if not exists push_subscriptions_trip_active_idx
  on public.push_subscriptions (trip_id) where revoked_at is null;

drop trigger if exists event_watch_states_set_updated_at on public.event_watch_states;
create trigger event_watch_states_set_updated_at before update on public.event_watch_states
for each row execute function public.set_updated_at();

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.event_watch_states enable row level security;
alter table public.event_change_log enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.event_watch_states, public.event_change_log, public.push_subscriptions from anon;
revoke insert, update, delete on public.event_watch_states, public.event_change_log, public.push_subscriptions from authenticated;
grant select on public.event_watch_states, public.event_change_log to authenticated;
grant usage on type public.event_change_kind to authenticated, service_role;
grant select, insert, update, delete on public.event_watch_states, public.event_change_log, public.push_subscriptions to service_role;

drop policy if exists "Family members can read watch state in their trips" on public.event_watch_states;
create policy "Family members can read watch state in their trips" on public.event_watch_states
for select to authenticated using (
  exists (
    select 1 from public.events
    join public.trip_members on trip_members.trip_id = events.trip_id
    where events.id = event_watch_states.event_id
      and trip_members.user_id = (select auth.uid())
  )
);

drop policy if exists "Family members can read event changes in their trips" on public.event_change_log;
create policy "Family members can read event changes in their trips" on public.event_change_log
for select to authenticated using (
  exists (
    select 1 from public.events
    join public.trip_members on trip_members.trip_id = events.trip_id
    where events.id = event_change_log.event_id
      and trip_members.user_id = (select auth.uid())
  )
);
