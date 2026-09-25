-- Multi-day AI change sets: atomic keep/remove/add application and exact grouped Undo.

create table if not exists public.timeline_proposal_operations (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  applied_at timestamptz not null default now(),
  undone_at timestamptz
);

create table if not exists public.timeline_proposal_undo_snapshots (
  proposal_id uuid not null references public.timeline_proposal_operations(id) on delete cascade,
  activity_id uuid not null,
  day_id uuid not null references public.days(id) on delete cascade,
  activity_snapshot jsonb not null,
  primary key (proposal_id, activity_id)
);

alter table public.timeline_proposal_operations enable row level security;
alter table public.timeline_proposal_undo_snapshots enable row level security;

create or replace function public.apply_timeline_proposal_changes(
  p_trip_slug text,
  p_proposal_id uuid,
  p_days jsonb
)
returns table(day_date date, activity_id uuid, day_version integer)
language plpgsql
as $$
declare
  v_trip_id uuid;
  v_day jsonb;
  v_day_id uuid;
  v_version integer;
  v_item jsonb;
  v_remove_count integer;
begin
  if jsonb_typeof(p_days) <> 'array'
    or jsonb_array_length(p_days) < 1
    or jsonb_array_length(p_days) > 14
  then
    raise exception using errcode = '22023', message = 'invalid_proposal_days';
  end if;

  if (select count(*) from jsonb_array_elements(p_days)) <>
     (select count(distinct value->>'date') from jsonb_array_elements(p_days))
  then
    raise exception using errcode = '22023', message = 'duplicate_proposal_day';
  end if;

  select id into v_trip_id from public.trips where slug = p_trip_slug;
  if v_trip_id is null then
    raise exception using errcode = 'P0002', message = 'timeline_trip_not_found';
  end if;

  insert into public.timeline_proposal_operations (id, trip_id) values (p_proposal_id, v_trip_id);

  -- Lock and validate every affected day in chronological order before mutating any row.
  for v_day in select value from jsonb_array_elements(p_days) order by value->>'date'
  loop
    select d.id, d.version into v_day_id, v_version
    from public.days d
    where d.trip_id = v_trip_id and d.date = (v_day->>'date')::date
    for update of d;

    if v_day_id is null then
      raise exception using errcode = 'P0002', message = 'timeline_day_not_found';
    end if;
    if v_version <> (v_day->>'expectedVersion')::integer then
      raise exception using errcode = '40001', message = 'timeline_version_conflict';
    end if;
    if coalesce(jsonb_typeof(v_day->'removeActivityIds'), '') <> 'array' or coalesce(jsonb_typeof(v_day->'items'), '') <> 'array'
      or jsonb_array_length(v_day->'items') > 10
    then
      raise exception using errcode = '22023', message = 'invalid_proposal_day_change';
    end if;

    select count(*) into v_remove_count
    from public.timeline_activities ta
    where ta.day_id = v_day_id
      and ta.id in (select value::uuid from jsonb_array_elements_text(v_day->'removeActivityIds'));
    if v_remove_count <> jsonb_array_length(v_day->'removeActivityIds') then
      raise exception using errcode = '40001', message = 'timeline_activity_conflict';
    end if;
  end loop;

  for v_day in select value from jsonb_array_elements(p_days) order by value->>'date'
  loop
    select d.id into v_day_id from public.days d
    where d.trip_id = v_trip_id and d.date = (v_day->>'date')::date;

    insert into public.timeline_proposal_undo_snapshots (proposal_id, activity_id, day_id, activity_snapshot)
    select p_proposal_id, ta.id, ta.day_id, to_jsonb(ta)
    from public.timeline_activities ta
    where ta.day_id = v_day_id
      and ta.id in (select value::uuid from jsonb_array_elements_text(v_day->'removeActivityIds'));

    delete from public.timeline_activities ta
    where ta.day_id = v_day_id
      and ta.id in (select value::uuid from jsonb_array_elements_text(v_day->'removeActivityIds'));

    for v_item in select value from jsonb_array_elements(v_day->'items')
    loop
      if coalesce(v_item->>'title', '') = ''
        or length(v_item->>'title') > 120
        or coalesce(v_item->>'startTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce((v_item->>'durationMinutes')::integer, 0) not between 1 and 1440
        or length(coalesce(v_item->>'locationName', '')) > 160
        or length(coalesce(v_item->>'description', '')) > 1000
      then
        raise exception using errcode = '22023', message = 'invalid_proposal_item';
      end if;

      insert into public.timeline_activities (
        id, day_id, start_time, start_time_precision, time_label,
        duration_minutes, title, location_name, place_slug, description,
        kind, is_system_generated, proposal_id
      ) values (
        (v_item->>'id')::uuid, v_day_id, (v_item->>'startTime')::time, 'exact', null,
        (v_item->>'durationMinutes')::integer, trim(v_item->>'title'), nullif(trim(v_item->>'locationName'), ''), null, nullif(trim(v_item->>'description'), ''),
        'plan', false, p_proposal_id
      );
    end loop;
  end loop;

  return query
    select d.date, ta.id, d.version
    from public.days d
    left join public.timeline_activities ta on ta.day_id = d.id and ta.proposal_id = p_proposal_id
    where d.trip_id = v_trip_id
      and d.date in (select (value->>'date')::date from jsonb_array_elements(p_days))
    order by d.date, ta.created_at, ta.id;
end;
$$;

create or replace function public.undo_timeline_proposal_changes(
  p_trip_slug text,
  p_proposal_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  v_operation public.timeline_proposal_operations%rowtype;
  v_deleted integer;
  v_restored integer;
  v_day_id uuid;
begin
  select operation.* into v_operation
  from public.timeline_proposal_operations operation
  join public.trips trip on trip.id = operation.trip_id
  where operation.id = p_proposal_id and trip.slug = p_trip_slug
  for update of operation;

  if v_operation.id is null or v_operation.undone_at is not null then return null; end if;

  for v_day_id in
    select day_id from public.timeline_proposal_undo_snapshots where proposal_id = p_proposal_id
    union
    select day_id from public.timeline_activities where proposal_id = p_proposal_id
    order by 1
  loop
    perform 1 from public.days where id = v_day_id for update;
  end loop;

  delete from public.timeline_activities where proposal_id = p_proposal_id;
  get diagnostics v_deleted = row_count;

  insert into public.timeline_activities
  select (jsonb_populate_record(null::public.timeline_activities, snapshot.activity_snapshot)).*
  from public.timeline_proposal_undo_snapshots snapshot
  where snapshot.proposal_id = p_proposal_id;
  get diagnostics v_restored = row_count;

  update public.timeline_proposal_operations set undone_at = now() where id = p_proposal_id;
  return jsonb_build_object('deletedCount', v_deleted, 'restoredCount', v_restored);
end;
$$;

revoke all on table public.timeline_proposal_operations from public, anon, authenticated;
revoke all on table public.timeline_proposal_undo_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.timeline_proposal_operations to service_role;
grant select, insert, update, delete on table public.timeline_proposal_undo_snapshots to service_role;
revoke all on function public.apply_timeline_proposal_changes(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.undo_timeline_proposal_changes(text, uuid) from public, anon, authenticated;
grant execute on function public.apply_timeline_proposal_changes(text, uuid, jsonb) to service_role;
grant execute on function public.undo_timeline_proposal_changes(text, uuid) to service_role;

comment on table public.timeline_proposal_undo_snapshots is 'Exact pre-change activity rows used to undo an accepted multi-day AI proposal.';
