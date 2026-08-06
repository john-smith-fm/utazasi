-- Sprint 1C: private family membership and in-app email OTP access.
-- Auth users are provisioned by a server-only script; browser clients cannot
-- create users or write membership rows.

create type public.trip_member_role as enum ('owner', 'member');

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  user_id uuid references auth.users(id) on delete set null,
  role public.trip_member_role not null default 'member',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_email_not_blank check (length(trim(email)) > 3),
  constraint trip_members_trip_email_unique unique (trip_id, email_normalized),
  constraint trip_members_trip_user_unique unique (trip_id, user_id)
);

create index trip_members_user_trip_idx on public.trip_members (user_id, trip_id);

create trigger trip_members_set_updated_at
before update on public.trip_members
for each row execute function public.set_updated_at();

-- Preserve access for any owner already linked by Sprint 1B.
insert into public.trip_members (trip_id, email, user_id, role, accepted_at)
select trips.id, auth_users.email, trips.user_id, 'owner', now()
from public.trips
join auth.users as auth_users on auth_users.id = trips.user_id
where trips.user_id is not null
on conflict (trip_id, email_normalized) do update
  set user_id = excluded.user_id,
      role = 'owner',
      accepted_at = coalesce(trip_members.accepted_at, excluded.accepted_at);

alter table public.trip_members enable row level security;

revoke all on public.trip_members from anon;
revoke insert, update, delete on public.trip_members from authenticated;
grant select on public.trip_members to authenticated;

drop policy if exists "Authenticated users can read own trips" on public.trips;
drop policy if exists "Authenticated users can read days in own trips" on public.days;
drop policy if exists "Authenticated users can read activities in own trips" on public.timeline_activities;

create policy "Family members can read their own membership"
on public.trip_members
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Family members can read their trips"
on public.trips
for select
to authenticated
using (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = trips.id
      and trip_members.user_id = (select auth.uid())
  )
);

create policy "Family members can read days in their trips"
on public.days
for select
to authenticated
using (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = days.trip_id
      and trip_members.user_id = (select auth.uid())
  )
);

create policy "Family members can read activities in their trips"
on public.timeline_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.days
    join public.trip_members on trip_members.trip_id = days.trip_id
    where days.id = timeline_activities.day_id
      and trip_members.user_id = (select auth.uid())
  )
);
