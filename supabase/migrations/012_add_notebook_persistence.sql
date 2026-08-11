-- Utazási 1.0 — Notebook Foundation
-- Family-created notebook data is runtime state. It is written only through
-- PIN-protected server routes; no anonymous or browser-direct writes exist.

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  is_packed boolean not null default false,
  position integer not null default 0 check (position >= 0),
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packing_items_trip_legacy_source_unique unique (trip_id, legacy_source_id)
);

create index if not exists packing_items_trip_position_idx
  on public.packing_items (trip_id, position, created_at);

create table if not exists public.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('expense', 'note', 'journal')),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  amount_eur numeric(10,2) check (amount_eur is null or amount_eur >= 0),
  occurred_on date not null,
  rating smallint check (rating is null or rating between 1 and 5),
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebook_entries_trip_legacy_source_unique unique (trip_id, legacy_source_id),
  constraint notebook_entries_kind_shape check (
    (kind = 'expense' and amount_eur is not null and rating is null)
    or (kind = 'note' and amount_eur is null and rating is null)
    or (kind = 'journal' and amount_eur is null)
  )
);

create index if not exists notebook_entries_trip_kind_date_idx
  on public.notebook_entries (trip_id, kind, occurred_on desc, created_at desc);

-- A local browser snapshot is imported once per stable device migration key.
-- The per-record legacy source IDs make a retry safe even after a partial run.
create table if not exists public.notebook_legacy_imports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  migration_key text not null check (char_length(migration_key) between 1 and 120),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint notebook_legacy_imports_trip_key_unique unique (trip_id, migration_key)
);

drop trigger if exists packing_items_set_updated_at on public.packing_items;
create trigger packing_items_set_updated_at
  before update on public.packing_items
  for each row execute function public.set_updated_at();

drop trigger if exists notebook_entries_set_updated_at on public.notebook_entries;
create trigger notebook_entries_set_updated_at
  before update on public.notebook_entries
  for each row execute function public.set_updated_at();

alter table public.packing_items enable row level security;
alter table public.notebook_entries enable row level security;
alter table public.notebook_legacy_imports enable row level security;

revoke all on public.packing_items, public.notebook_entries, public.notebook_legacy_imports from anon;
revoke all on public.packing_items, public.notebook_entries, public.notebook_legacy_imports from authenticated;
grant select, insert, update, delete on public.packing_items, public.notebook_entries, public.notebook_legacy_imports to service_role;
