-- Optional canonical identity for a Timeline location.
-- The canonical Place catalogue remains versioned JSON, so no database foreign
-- key is appropriate until Places are imported into Supabase in a later phase.
alter table public.timeline_activities
  add column if not exists place_slug text null;
