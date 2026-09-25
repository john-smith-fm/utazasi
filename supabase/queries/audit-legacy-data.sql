-- Read-only validation for the data migrations in 009-011.
-- Only aggregate counts are returned; no application rows are exposed.

select
  '009_non_exact_sardinia_timeline_rows' as invariant,
  count(*) as violations
from public.timeline_activities as activities
join public.days on days.id = activities.day_id
join public.trips on trips.id = days.trip_id
where trips.slug = 'sardinia-family-2026'
  and (
    activities.start_time_precision <> 'exact'
    or activities.time_label is not null
  )

union all

select
  '010_legacy_invaso_event_rows',
  count(*)
from public.events
where canonical_key = 'event_invaso_festival_muravera_2026'

union all

select
  '011_enabled_watches_without_timeline',
  count(*)
from public.event_watch_states as watch
where watch.enabled = true
  and not exists (
    select 1
    from public.timeline_activities as activity
    where activity.source_event_id = watch.event_id
  )

order by invariant;
