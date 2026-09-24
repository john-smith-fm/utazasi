-- Optional development seed. Run only after migrations 013 and 014.
-- It creates a two-day V2 Trip anchored to the day it is run.
-- Re-running it never deletes existing Timeline data.

insert into public.trips (
  slug,
  name,
  destination,
  start_date,
  end_date,
  timezone,
  status
)
values (
  'utazasi-v2-poc',
  'Utazási 2.0 POC',
  'Teszt úticél',
  current_date,
  current_date + 1,
  'Europe/Budapest',
  'draft'
)
on conflict (slug) do update set
  name = excluded.name,
  destination = excluded.destination,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  timezone = excluded.timezone,
  status = excluded.status;

insert into public.days (trip_id, date, title, subtitle)
select trip.id, current_date + seed.day_offset, seed.title, seed.subtitle
from public.trips trip
cross join (
  values
    (0, 'Ma', 'Üres, kézzel vagy AI-val alakítható nap'),
    (1, 'Holnap', 'Az adaptív tervezési scenario célnapja')
) as seed(day_offset, title, subtitle)
where trip.slug = 'utazasi-v2-poc'
on conflict (trip_id, date) do update set
  title = excluded.title,
  subtitle = excluded.subtitle;
