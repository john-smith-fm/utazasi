-- Sprint 1B: private, read-only family access through Supabase Auth.
-- Existing seeded rows remain temporarily nullable so their owner can be
-- assigned by the server-side seed importer after the first magic-link login.

alter table public.trips
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists trips_user_id_idx on public.trips (user_id);

-- The initial migration granted DML to authenticated. Sprint 1B is read-only.
revoke all on public.trips, public.days, public.timeline_activities from anon;
revoke insert, update, delete on public.trips, public.days, public.timeline_activities from authenticated;
grant select on public.trips, public.days, public.timeline_activities to authenticated;

drop policy if exists "Authenticated users can read own trips" on public.trips;
create policy "Authenticated users can read own trips"
on public.trips
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read days in own trips" on public.days;
create policy "Authenticated users can read days in own trips"
on public.days
for select
to authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = days.trip_id
      and trips.user_id = (select auth.uid())
  )
);

drop policy if exists "Authenticated users can read activities in own trips" on public.timeline_activities;
create policy "Authenticated users can read activities in own trips"
on public.timeline_activities
for select
to authenticated
using (
  exists (
    select 1
    from public.days
    join public.trips on trips.id = days.trip_id
    where days.id = timeline_activities.day_id
      and trips.user_id = (select auth.uid())
  )
);
