-- Run after migration 007 and `npm run seed:supabase`.
-- Read-only verification: no data is written or changed.

select
  events.title,
  event_watch_states.enabled,
  event_watch_states.baseline_status,
  event_watch_states.baseline_starts_at,
  event_watch_states.last_success_at
from public.event_watch_states
join public.events on events.id = event_watch_states.event_id
order by events.starts_at;

select
  event_change_log.change_kind,
  events.title,
  event_change_log.observed_at,
  event_change_log.notified_at
from public.event_change_log
join public.events on events.id = event_change_log.event_id
order by event_change_log.observed_at desc;
