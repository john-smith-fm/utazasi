-- Read-only post-migration verification for the Utazási 2.0 schema.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'timezone'
  ) then
    raise exception 'v2_schema_verification_failed: trips.timezone is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'status'
  ) then
    raise exception 'v2_schema_verification_failed: trips.status is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trips' and column_name = 'version'
  ) then
    raise exception 'v2_schema_verification_failed: trips.version is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'days' and column_name = 'version'
  ) then
    raise exception 'v2_schema_verification_failed: days.version is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'timeline_activities' and column_name = 'proposal_id'
  ) then
    raise exception 'v2_schema_verification_failed: timeline_activities.proposal_id is missing';
  end if;

  if to_regprocedure('public.bump_timeline_day_version()') is null then
    raise exception 'v2_schema_verification_failed: bump_timeline_day_version is missing';
  end if;

  if to_regprocedure('public.apply_timeline_proposal(text,date,integer,uuid,jsonb)') is null then
    raise exception 'v2_schema_verification_failed: apply_timeline_proposal is missing';
  end if;

  if to_regprocedure('public.undo_timeline_proposal(text,uuid)') is null then
    raise exception 'v2_schema_verification_failed: undo_timeline_proposal is missing';
  end if;

  if has_function_privilege('anon', 'public.apply_timeline_proposal(text,date,integer,uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.apply_timeline_proposal(text,date,integer,uuid,jsonb)', 'EXECUTE')
    or has_function_privilege('anon', 'public.undo_timeline_proposal(text,uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.undo_timeline_proposal(text,uuid)', 'EXECUTE')
  then
    raise exception 'v2_schema_verification_failed: Timeline proposal RPC is browser-executable';
  end if;

  if not has_function_privilege('service_role', 'public.apply_timeline_proposal(text,date,integer,uuid,jsonb)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.undo_timeline_proposal(text,uuid)', 'EXECUTE')
  then
    raise exception 'v2_schema_verification_failed: service_role cannot execute Timeline proposal RPC';
  end if;
end;
$$;

select
  'v2_schema' as check_name,
  'OK' as status;
