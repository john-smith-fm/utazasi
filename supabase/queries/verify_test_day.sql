-- Read-only post-seed verification. Expected result: 6 chronological rows.
select
  t.slug as trip_slug,
  d.date,
  d.title as day_title,
  a.start_time,
  a.duration_minutes,
  a.title,
  a.location_name,
  a.kind,
  a.is_system_generated
from public.trips t
join public.days d on d.trip_id = t.id
join public.timeline_activities a on a.day_id = d.id
where t.slug = 'sardinia-family-2026'
  and d.date = date '2026-09-03'
order by a.start_time asc, a.created_at asc;
