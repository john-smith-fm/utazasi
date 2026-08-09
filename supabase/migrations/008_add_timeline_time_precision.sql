-- Timeline items can be exact, approximately timed, or intentionally placed
-- in a broad part of the day. start_time remains a private sort anchor for
-- period items; the client never presents that anchor as a false exact time.

do $$
begin
  create type public.timeline_time_precision as enum ('exact', 'approximate', 'period');
exception
  when duplicate_object then null;
end $$;

alter table public.timeline_activities
  add column if not exists start_time_precision public.timeline_time_precision not null default 'exact',
  add column if not exists time_label text;

alter table public.timeline_activities
  drop constraint if exists timeline_activities_time_precision_label_valid;

alter table public.timeline_activities
  add constraint timeline_activities_time_precision_label_valid check (
    (start_time_precision in ('exact', 'approximate') and time_label is null)
    or (start_time_precision = 'period' and time_label in ('Reggel', 'Délelőtt', 'Délután', 'Este'))
  );

grant usage on type public.timeline_time_precision to authenticated, service_role;
