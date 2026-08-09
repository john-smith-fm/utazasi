-- Timeline time precision is now a legacy compatibility field. The product
-- presents every Timeline entry as one planned start time.
-- Keep the columns and enum from 008 intact; normalize existing runtime rows.

update public.timeline_activities as activities
set
  start_time_precision = 'exact',
  time_label = null
from public.days
join public.trips on trips.id = days.trip_id
where activities.day_id = days.id
  and trips.slug = 'sardinia-family-2026'
  and (
    activities.start_time_precision <> 'exact'
    or activities.time_label is not null
  );
