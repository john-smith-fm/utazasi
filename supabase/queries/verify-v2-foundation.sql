-- Read-only post-deploy verification for the Utazási 2.0 Supabase foundation.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'timezone'
  ) then
    raise exception 'v2_verification_failed: trips.timezone is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'version'
  ) then
    raise exception 'v2_verification_failed: trips.version is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'days' and column_name = 'version'
  ) then
    raise exception 'v2_verification_failed: days.version is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'timeline_activities' and column_name = 'proposal_id'
  ) then
    raise exception 'v2_verification_failed: timeline_activities.proposal_id is missing';
  end if;

  if to_regprocedure('public.apply_timeline_proposal(text,date,integer,uuid,jsonb)') is null then
    raise exception 'v2_verification_failed: apply_timeline_proposal is missing';
  end if;

  if to_regprocedure('public.undo_timeline_proposal(text,uuid)') is null then
    raise exception 'v2_verification_failed: undo_timeline_proposal is missing';
  end if;

  if not exists (
    select 1
    from public.trips
    where slug = 'utazasi-v2-poc'
      and start_date = current_date
      and end_date = current_date + 1
  ) then
    raise exception 'v2_verification_failed: current POC Trip is missing';
  end if;

  if (
    select count(*)
    from public.days d
    join public.trips t on t.id = d.trip_id
    where t.slug = 'utazasi-v2-poc'
      and d.date in (current_date, current_date + 1)
  ) <> 2 then
    raise exception 'v2_verification_failed: current POC days are missing';
  end if;
end;
$$;

select
  t.slug,
  t.start_date,
  t.end_date,
  t.timezone,
  t.status,
  count(d.id) filter (where d.date in (current_date, current_date + 1)) as current_poc_days
from public.trips t
left join public.days d on d.trip_id = t.id
where t.slug = 'utazasi-v2-poc'
group by t.id, t.slug, t.start_date, t.end_date, t.timezone, t.status;
