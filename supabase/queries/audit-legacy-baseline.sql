-- Read-only catalogue audit for the legacy 001-012 production baseline.
-- This intentionally returns object names and OK/MISSING status only. It does
-- not read or export application rows.

with
required_tables(name) as (
  values
    ('trips'),
    ('days'),
    ('timeline_activities'),
    ('trip_members'),
    ('events'),
    ('event_watch_states'),
    ('event_change_log'),
    ('push_subscriptions'),
    ('event_series'),
    ('packing_items'),
    ('notebook_entries'),
    ('notebook_legacy_imports')
),
required_columns(table_name, column_name) as (
  values
    ('trips', 'slug'),
    ('trips', 'name'),
    ('trips', 'destination'),
    ('trips', 'start_date'),
    ('trips', 'end_date'),
    ('trips', 'user_id'),
    ('days', 'trip_id'),
    ('days', 'date'),
    ('days', 'title'),
    ('days', 'subtitle'),
    ('timeline_activities', 'day_id'),
    ('timeline_activities', 'start_time'),
    ('timeline_activities', 'duration_minutes'),
    ('timeline_activities', 'title'),
    ('timeline_activities', 'kind'),
    ('timeline_activities', 'seed_key'),
    ('timeline_activities', 'place_slug'),
    ('timeline_activities', 'source_event_id'),
    ('timeline_activities', 'start_time_precision'),
    ('timeline_activities', 'time_label'),
    ('trip_members', 'trip_id'),
    ('trip_members', 'email'),
    ('trip_members', 'user_id'),
    ('trip_members', 'role'),
    ('events', 'trip_id'),
    ('events', 'canonical_key'),
    ('events', 'starts_at'),
    ('events', 'source_url'),
    ('events', 'status'),
    ('events', 'series_id'),
    ('event_watch_states', 'event_id'),
    ('event_watch_states', 'enabled'),
    ('event_watch_states', 'baseline_status'),
    ('event_change_log', 'event_id'),
    ('event_change_log', 'change_kind'),
    ('event_change_log', 'change_fingerprint'),
    ('push_subscriptions', 'trip_id'),
    ('push_subscriptions', 'endpoint'),
    ('push_subscriptions', 'subscription'),
    ('event_series', 'trip_id'),
    ('event_series', 'canonical_key'),
    ('event_series', 'starts_at'),
    ('event_series', 'source_url'),
    ('packing_items', 'trip_id'),
    ('packing_items', 'title'),
    ('packing_items', 'is_packed'),
    ('packing_items', 'position'),
    ('packing_items', 'legacy_source_id'),
    ('notebook_entries', 'trip_id'),
    ('notebook_entries', 'kind'),
    ('notebook_entries', 'content'),
    ('notebook_entries', 'occurred_on'),
    ('notebook_entries', 'legacy_source_id'),
    ('notebook_legacy_imports', 'trip_id'),
    ('notebook_legacy_imports', 'migration_key')
),
required_types(name) as (
  values
    ('timeline_activity_kind'),
    ('trip_member_role'),
    ('event_status'),
    ('event_change_kind'),
    ('timeline_time_precision')
),
required_policies(table_name, policy_name) as (
  values
    ('trip_members', 'Family members can read their own membership'),
    ('trips', 'Family members can read their trips'),
    ('days', 'Family members can read days in their trips'),
    ('timeline_activities', 'Family members can read activities in their trips'),
    ('events', 'Family members can read events in their trips'),
    ('event_watch_states', 'Family members can read watch state in their trips'),
    ('event_change_log', 'Family members can read event changes in their trips'),
    ('event_series', 'Family members can read event series in their trips')
),
required_triggers(table_name, trigger_name) as (
  values
    ('timeline_activities', 'timeline_activities_set_updated_at'),
    ('trip_members', 'trip_members_set_updated_at'),
    ('events', 'events_set_updated_at'),
    ('event_watch_states', 'event_watch_states_set_updated_at'),
    ('push_subscriptions', 'push_subscriptions_set_updated_at'),
    ('event_series', 'event_series_set_updated_at'),
    ('packing_items', 'packing_items_set_updated_at'),
    ('notebook_entries', 'notebook_entries_set_updated_at')
),
required_indexes(name) as (
  values
    ('days_trip_id_date_idx'),
    ('timeline_activities_day_time_created_idx'),
    ('trips_user_id_idx'),
    ('trip_members_user_trip_idx'),
    ('events_trip_starts_at_idx'),
    ('events_trip_status_idx'),
    ('timeline_activities_source_event_id_idx'),
    ('event_watch_states_enabled_idx'),
    ('event_change_log_event_observed_idx'),
    ('event_change_log_unnotified_idx'),
    ('push_subscriptions_trip_active_idx'),
    ('event_series_trip_starts_at_idx'),
    ('events_series_id_idx'),
    ('packing_items_trip_position_idx'),
    ('notebook_entries_trip_kind_date_idx')
),
required_constraints(table_name, constraint_name) as (
  values
    ('trips', 'trips_valid_date_range'),
    ('trips', 'trips_slug_format'),
    ('days', 'days_trip_date_unique'),
    ('timeline_activities', 'timeline_activities_duration_positive'),
    ('timeline_activities', 'timeline_activities_seed_key_unique'),
    ('timeline_activities', 'timeline_activities_time_precision_label_valid'),
    ('trip_members', 'trip_members_trip_email_unique'),
    ('trip_members', 'trip_members_trip_user_unique'),
    ('events', 'events_trip_canonical_key_unique'),
    ('event_change_log', 'event_change_log_fingerprint_not_blank'),
    ('event_series', 'event_series_trip_canonical_key_unique'),
    ('packing_items', 'packing_items_trip_legacy_source_unique'),
    ('notebook_entries', 'notebook_entries_trip_legacy_source_unique'),
    ('notebook_entries', 'notebook_entries_kind_shape'),
    ('notebook_legacy_imports', 'notebook_legacy_imports_trip_key_unique')
),
checks as (
  select
    'table'::text as object_kind,
    'public.' || required_tables.name as object_name,
    to_regclass('public.' || required_tables.name) is not null as present
  from required_tables

  union all

  select
    'column',
    'public.' || required_columns.table_name || '.' || required_columns.column_name,
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = required_columns.table_name
        and column_name = required_columns.column_name
    )
  from required_columns

  union all

  select
    'type',
    'public.' || required_types.name,
    exists (
      select 1
      from pg_type
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where pg_namespace.nspname = 'public'
        and pg_type.typname = required_types.name
    )
  from required_types

  union all

  select
    'function',
    'public.set_updated_at()',
    to_regprocedure('public.set_updated_at()') is not null

  union all

  select
    'policy',
    'public.' || required_policies.table_name || ':' || required_policies.policy_name,
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = required_policies.table_name
        and policyname = required_policies.policy_name
    )
  from required_policies

  union all

  select
    'trigger',
    'public.' || required_triggers.table_name || ':' || required_triggers.trigger_name,
    exists (
      select 1
      from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table = required_triggers.table_name
        and trigger_name = required_triggers.trigger_name
    )
  from required_triggers

  union all

  select
    'index',
    'public.' || required_indexes.name,
    to_regclass('public.' || required_indexes.name) is not null
  from required_indexes

  union all

  select
    'constraint',
    'public.' || required_constraints.table_name || ':' || required_constraints.constraint_name,
    exists (
      select 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relname = required_constraints.table_name
        and pg_constraint.conname = required_constraints.constraint_name
    )
  from required_constraints

  union all

  select
    'rls',
    'public.' || required_tables.name,
    coalesce(pg_class.relrowsecurity, false)
  from required_tables
  left join pg_namespace on pg_namespace.nspname = 'public'
  left join pg_class
    on pg_class.relnamespace = pg_namespace.oid
   and pg_class.relname = required_tables.name
)
select
  object_kind,
  object_name,
  case when present then 'OK' else 'MISSING' end as status
from checks
order by present, object_kind, object_name;
