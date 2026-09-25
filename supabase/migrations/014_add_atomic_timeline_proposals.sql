-- Atomic Timeline proposal application with optimistic day-level concurrency.
-- Existing activities remain untouched and receive no proposal marker.

alter table public.days
  add column if not exists version integer not null default 1;

alter table public.days
  drop constraint if exists days_version_positive,
  add constraint days_version_positive check (version > 0);

alter table public.timeline_activities
  add column if not exists proposal_id uuid;

create index if not exists timeline_activities_proposal_id_idx
  on public.timeline_activities (proposal_id)
  where proposal_id is not null;

create or replace function public.bump_timeline_day_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    update public.days set version = version + 1 where id = old.day_id;
    return old;
  end if;

  update public.days set version = version + 1 where id = new.day_id;
  if tg_op = 'UPDATE' and old.day_id is distinct from new.day_id then
    update public.days set version = version + 1 where id = old.day_id;
  end if;
  return new;
end;
$$;

drop trigger if exists timeline_activities_bump_day_version on public.timeline_activities;
create trigger timeline_activities_bump_day_version
after insert or update or delete on public.timeline_activities
for each row execute function public.bump_timeline_day_version();

create or replace function public.apply_timeline_proposal(
  p_trip_slug text,
  p_day_date date,
  p_expected_version integer,
  p_proposal_id uuid,
  p_items jsonb
)
returns table(activity_id uuid, day_version integer)
language plpgsql
as $$
declare
  v_day_id uuid;
  v_version integer;
  v_item jsonb;
  v_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid_proposal_items';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 10 then
    raise exception using errcode = '22023', message = 'invalid_proposal_item_count';
  end if;

  select d.id, d.version
    into v_day_id, v_version
  from public.days d
  join public.trips t on t.id = d.trip_id
  where t.slug = p_trip_slug and d.date = p_day_date
  for update of d;

  if v_day_id is null then
    raise exception using errcode = 'P0002', message = 'timeline_day_not_found';
  end if;
  if v_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'timeline_version_conflict';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
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

  select version into v_version from public.days where id = v_day_id;
  return query
    select ta.id, v_version
    from public.timeline_activities ta
    where ta.day_id = v_day_id and ta.proposal_id = p_proposal_id
    order by ta.created_at, ta.id;
end;
$$;

create or replace function public.undo_timeline_proposal(
  p_trip_slug text,
  p_proposal_id uuid
)
returns integer
language plpgsql
as $$
declare
  v_deleted integer;
begin
  delete from public.timeline_activities ta
  using public.days d, public.trips t
  where ta.day_id = d.id
    and d.trip_id = t.id
    and t.slug = p_trip_slug
    and ta.proposal_id = p_proposal_id
    and ta.kind = 'plan'
    and ta.is_system_generated = false;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.bump_timeline_day_version() from public, anon, authenticated;
revoke all on function public.apply_timeline_proposal(text, date, integer, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.undo_timeline_proposal(text, uuid) from public, anon, authenticated;
grant execute on function public.bump_timeline_day_version() to service_role;
grant execute on function public.apply_timeline_proposal(text, date, integer, uuid, jsonb) to service_role;
grant execute on function public.undo_timeline_proposal(text, uuid) to service_role;

comment on column public.days.version is 'Optimistic concurrency version incremented after every Timeline activity mutation.';
comment on column public.timeline_activities.proposal_id is 'Groups activities created by one accepted AI proposal for atomic Undo.';
