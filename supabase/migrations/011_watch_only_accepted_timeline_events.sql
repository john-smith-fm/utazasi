-- A concrete Event may exist as a research suggestion before the family adds
-- it to the Timeline. Suggestions must never be watched or trigger a push.
-- The server also enforces this join at runtime; this migration corrects any
-- legacy enabled rows already present in production.

update public.event_watch_states as watch
set enabled = false
where watch.enabled = true
  and not exists (
    select 1
    from public.timeline_activities as activity
    where activity.source_event_id = watch.event_id
  );
