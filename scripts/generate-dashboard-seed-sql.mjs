import { readFile, writeFile } from "node:fs/promises";

const [trip, timeline, events] = await Promise.all([
  readFile(new URL("../knowledge/trip/trip.public.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../knowledge/trip/timeline.initial.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../knowledge/events/events.json", import.meta.url), "utf8").then(JSON.parse),
]);

const payload = JSON.stringify({ trip, timeline, events });
const sql = `-- Utazási 1.0 — one-time Dashboard seed
-- Generated from canonical Git JSON. Run in Supabase SQL Editor as postgres.
-- Requires migrations 001–006 and 008. It is safe to rerun after the first run:
-- later family edits are never overwritten. The old Sep 3 test day is deleted
-- only while its known legacy seed rows still exist.

begin;

do $$
begin
  if to_regtype('public.timeline_time_precision') is null then
    raise exception 'Missing migration 008_add_timeline_time_precision.sql. Run migrations 001–008 first.';
  end if;
end;
$$;

create temporary table _utazasi_seed (payload jsonb not null) on commit drop;
insert into _utazasi_seed (payload) values ($utazasi_seed$${payload}$utazasi_seed$::jsonb);

with source as (
  select payload -> 'trip' as trip from _utazasi_seed
)
insert into public.trips (slug, name, destination, start_date, end_date)
select
  trip ->> 'slug',
  trip ->> 'name',
  trip #>> '{destination,name}',
  (trip #>> '{dates,start}')::date,
  (trip #>> '{dates,end}')::date
from source
on conflict (slug) do update set
  name = excluded.name,
  destination = excluded.destination,
  start_date = excluded.start_date,
  end_date = excluded.end_date;

with source as (
  select payload -> 'trip' as trip from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select trip ->> 'slug' from source)
), day_source as (
  select jsonb_array_elements((select trip -> 'days' from source)) as day
)
insert into public.days (trip_id, date, title, subtitle)
select
  current_trip.id,
  (day ->> 'date')::date,
  day ->> 'title',
  day ->> 'subtitle'
from day_source cross join current_trip
on conflict (trip_id, date) do update set
  title = excluded.title,
  subtitle = excluded.subtitle;

-- Explicit one-time replacement of the old Sep 3 fixture. Once the fixture
-- seed keys are gone, later reruns leave Sep 3 family edits intact.
do $$
declare
  current_trip_id uuid;
  sep3_day_id uuid;
  legacy_fixture_exists boolean;
begin
  select id into current_trip_id from public.trips where slug = 'sardinia-family-2026';
  select id into sep3_day_id from public.days where trip_id = current_trip_id and date = date '2026-09-03';
  select exists (
    select 1 from public.timeline_activities
    where seed_key in (
      '2026-09-03-wake', '2026-09-03-beach', '2026-09-03-lunch',
      '2026-09-03-nap', '2026-09-03-gelato', '2026-09-03-dinner'
    )
  ) into legacy_fixture_exists;

  if legacy_fixture_exists then
    delete from public.timeline_activities where day_id = sep3_day_id;
  end if;

  delete from public.timeline_activities
  where seed_key in (
    'trip-core-outbound-flight', 'trip-core-accommodation-check-in',
    'trip-core-accommodation-check-out', 'trip-core-return-flight'
  );
end;
$$;

with source as (
  select payload as data from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select data #>> '{trip,slug}' from source)
), activity_source as (
  select
    (day ->> 'date')::date as activity_date,
    activity
  from source,
    lateral jsonb_array_elements(data #> '{timeline,days}') as day,
    lateral jsonb_array_elements(day -> 'activities') as activity
)
insert into public.timeline_activities (
  day_id, seed_key, start_time, start_time_precision, time_label,
  duration_minutes, title, description, location_name, place_slug,
  kind, is_system_generated
)
select
  days.id,
  activity ->> 'seed_key',
  (activity ->> 'start_time')::time,
  (activity ->> 'time_precision')::public.timeline_time_precision,
  activity ->> 'time_label',
  (activity ->> 'duration_minutes')::integer,
  activity ->> 'title',
  activity ->> 'description',
  activity ->> 'location_name',
  activity ->> 'place_slug',
  'plan'::public.timeline_activity_kind,
  false
from activity_source
join current_trip on true
join public.days on days.trip_id = current_trip.id and days.date = activity_source.activity_date
on conflict (seed_key) do nothing;

with source as (
  select payload as data from _utazasi_seed
), current_trip as (
  select id from public.trips where slug = (select data #>> '{trip,slug}' from source)
), event_source as (
  select jsonb_array_elements(data #> '{events,events}') as event from source
)
insert into public.events (
  trip_id, canonical_key, title, starts_at, ends_at, organizer,
  source_url, status, place_slug, last_verified_at
)
select
  current_trip.id,
  event ->> 'id',
  event ->> 'title',
  (event ->> 'starts_at')::timestamptz,
  nullif(event ->> 'ends_at', '')::timestamptz,
  event ->> 'organizer',
  event ->> 'source_url',
  case when event ->> 'status' = 'cancelled' then 'cancelled'::public.event_status else 'scheduled'::public.event_status end,
  event ->> 'place_slug',
  (nullif(event #>> '{metadata,verification,last_checked}', '') || 'T00:00:00+02:00')::timestamptz
from event_source cross join current_trip
on conflict (trip_id, canonical_key) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  organizer = excluded.organizer,
  source_url = excluded.source_url,
  status = excluded.status,
  place_slug = excluded.place_slug,
  last_verified_at = excluded.last_verified_at;

-- Verification result: exactly 12 days, with their current activity totals.
select days.date, days.title, count(timeline_activities.id) as timeline_activity_count
from public.days
join public.trips on trips.id = days.trip_id
left join public.timeline_activities on timeline_activities.day_id = days.id
where trips.slug = 'sardinia-family-2026'
group by days.date, days.title
order by days.date;

commit;
`;

await writeFile(new URL("../supabase/seeds/replace-test-day.sql", import.meta.url), sql);
console.log("Wrote supabase/seeds/replace-test-day.sql");
