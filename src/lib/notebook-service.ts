import "server-only";

import { TIMELINE_TRIP_SLUG, timelineServerClient } from "@/lib/timeline-service";
import type { LegacyNotebookSnapshot, NotebookEntryKind, NotebookEntryRecord, PackingItemRecord } from "@/lib/notebook-types";

type ServiceResult<T> = { data: T } | { error: string; status: number };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DbPacking = { id: string; title: string; is_packed: boolean; position: number; created_at: string; updated_at: string };
type DbEntry = { id: string; kind: NotebookEntryKind; content: string; amount_eur: number | string | null; occurred_on: string; rating: number | null; created_at: string; updated_at: string };

function packingRecord(row: DbPacking): PackingItemRecord {
  return { id: row.id, title: row.title, isPacked: row.is_packed, position: row.position, createdAt: row.created_at, updatedAt: row.updated_at };
}

function entryRecord(row: DbEntry): NotebookEntryRecord {
  return { id: row.id, kind: row.kind, content: row.content, amountEur: row.amount_eur === null ? null : Number(row.amount_eur), occurredOn: row.occurred_on, rating: row.rating, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function tripId(): Promise<ServiceResult<string>> {
  const { data, error } = await timelineServerClient().from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
  if (error) throw error;
  return data ? { data: data.id } : { error: "Az utazás nem található.", status: 404 };
}

function validId(value: unknown) { return typeof value === "string" && UUID_PATTERN.test(value); }

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: unknown) { return typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)); }

function entryInput(raw: unknown): ServiceResult<{ kind: NotebookEntryKind; content: string; amountEur: number | null; occurredOn: string; rating: number | null }> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen bejegyzés.", status: 400 };
  const input = raw as Record<string, unknown>;
  const kind = input.kind;
  const content = text(input.content, 2000);
  const occurredOn = input.occurredOn;
  const amount = input.amountEur === null || input.amountEur === undefined || input.amountEur === "" ? null : Number(input.amountEur);
  const rating = input.rating === null || input.rating === undefined || input.rating === "" ? null : Number(input.rating);
  if (kind !== "expense" && kind !== "note" && kind !== "journal") return { error: "Érvénytelen bejegyzéstípus.", status: 400 };
  if (!content) return { error: "Adj meg tartalmat.", status: 400 };
  if (!validDate(occurredOn)) return { error: "Adj meg érvényes dátumot.", status: 400 };
  if (kind === "expense" && (!Number.isFinite(amount) || amount === null || amount < 0)) return { error: "Adj meg érvényes összeget.", status: 400 };
  if (kind !== "expense" && amount !== null) return { error: "Az összeg csak kiadásnál használható.", status: 400 };
  if (kind !== "journal" && rating !== null) return { error: "Értékelés csak naplónál használható.", status: 400 };
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return { error: "Az értékelés 1 és 5 között lehet.", status: 400 };
  return { data: { kind: kind as NotebookEntryKind, content, amountEur: kind === "expense" ? amount : null, occurredOn: occurredOn as string, rating } };
}

function packingInput(raw: unknown): ServiceResult<{ title: string; isPacked: boolean; position: number }> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen pakolási tétel.", status: 400 };
  const input = raw as Record<string, unknown>;
  const title = text(input.title, 160);
  const isPacked = typeof input.isPacked === "boolean" ? input.isPacked : false;
  const position = Number(input.position ?? 0);
  if (!title) return { error: "Adj meg tételnevet.", status: 400 };
  if (!Number.isInteger(position) || position < 0) return { error: "Érvénytelen listahely.", status: 400 };
  return { data: { title, isPacked, position } };
}

export async function readNotebook(): Promise<ServiceResult<{ packing: PackingItemRecord[]; entries: NotebookEntryRecord[] }>> {
  const trip = await tripId();
  if ("error" in trip) return trip;
  const supabase = timelineServerClient();
  const [packing, entries] = await Promise.all([
    supabase.from("packing_items").select("id, title, is_packed, position, created_at, updated_at").eq("trip_id", trip.data).order("position").order("created_at"),
    supabase.from("notebook_entries").select("id, kind, content, amount_eur, occurred_on, rating, created_at, updated_at").eq("trip_id", trip.data).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (packing.error) throw packing.error;
  if (entries.error) throw entries.error;
  return { data: { packing: (packing.data as DbPacking[]).map(packingRecord), entries: (entries.data as DbEntry[]).map(entryRecord) } };
}

export async function createNotebookEntry(raw: unknown): Promise<ServiceResult<NotebookEntryRecord>> {
  const input = entryInput(raw);
  if ("error" in input) return input;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const { data, error } = await timelineServerClient().from("notebook_entries").insert({ trip_id: trip.data, kind: input.data.kind, content: input.data.content, amount_eur: input.data.amountEur, occurred_on: input.data.occurredOn, rating: input.data.rating }).select("id, kind, content, amount_eur, occurred_on, rating, created_at, updated_at").single();
  if (error) throw error;
  return { data: entryRecord(data as DbEntry) };
}

export async function updateNotebookEntry(id: unknown, raw: unknown): Promise<ServiceResult<NotebookEntryRecord>> {
  if (!validId(id)) return { error: "Érvénytelen bejegyzés.", status: 400 };
  const entryId = id as string;
  const input = entryInput(raw);
  if ("error" in input) return input;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const { data, error } = await timelineServerClient().from("notebook_entries").update({ kind: input.data.kind, content: input.data.content, amount_eur: input.data.amountEur, occurred_on: input.data.occurredOn, rating: input.data.rating }).eq("id", entryId).eq("trip_id", trip.data).select("id, kind, content, amount_eur, occurred_on, rating, created_at, updated_at").maybeSingle();
  if (error) throw error;
  return data ? { data: entryRecord(data as DbEntry) } : { error: "A bejegyzés nem található.", status: 404 };
}

export async function createPackingItem(raw: unknown): Promise<ServiceResult<PackingItemRecord>> {
  const input = packingInput(raw);
  if ("error" in input) return input;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const { data, error } = await timelineServerClient().from("packing_items").insert({ trip_id: trip.data, title: input.data.title, is_packed: input.data.isPacked, position: input.data.position }).select("id, title, is_packed, position, created_at, updated_at").single();
  if (error) throw error;
  return { data: packingRecord(data as DbPacking) };
}

export async function updatePackingItem(id: unknown, raw: unknown): Promise<ServiceResult<PackingItemRecord>> {
  if (!validId(id)) return { error: "Érvénytelen pakolási tétel.", status: 400 };
  const packingId = id as string;
  const input = packingInput(raw);
  if ("error" in input) return input;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const { data, error } = await timelineServerClient().from("packing_items").update({ title: input.data.title, is_packed: input.data.isPacked, position: input.data.position }).eq("id", packingId).eq("trip_id", trip.data).select("id, title, is_packed, position, created_at, updated_at").maybeSingle();
  if (error) throw error;
  return data ? { data: packingRecord(data as DbPacking) } : { error: "A pakolási tétel nem található.", status: 404 };
}

export async function deleteNotebookRecord(resource: unknown, id: unknown): Promise<ServiceResult<{ id: string }>> {
  if ((resource !== "entry" && resource !== "packing") || !validId(id)) return { error: "Érvénytelen törlési kérés.", status: 400 };
  const recordId = id as string;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const table = resource === "entry" ? "notebook_entries" : "packing_items";
  const { data, error } = await timelineServerClient().from(table).delete().eq("id", recordId).eq("trip_id", trip.data).select("id").maybeSingle();
  if (error) throw error;
  return data ? { data: { id: data.id } } : { error: "A rekord nem található.", status: 404 };
}

function snapshot(raw: unknown): ServiceResult<LegacyNotebookSnapshot> {
  if (!raw || typeof raw !== "object") return { error: "Érvénytelen régi Jegyzetfüzet-adat.", status: 400 };
  const input = raw as Partial<LegacyNotebookSnapshot>;
  if (!Array.isArray(input.expenses) || !Array.isArray(input.packing) || !Array.isArray(input.journal)) return { error: "Hiányos régi Jegyzetfüzet-adat.", status: 400 };
  if (input.expenses.length > 500 || input.packing.length > 500 || input.journal.length > 500) return { error: "Túl sok importálandó adat.", status: 400 };
  return { data: { expenses: input.expenses, packing: input.packing, journal: input.journal } };
}

/** Imports one legacy browser snapshot once. Retries use deterministic source IDs. */
export async function importLegacyNotebook(migrationKey: unknown, rawSnapshot: unknown): Promise<ServiceResult<{ imported: boolean }>> {
  const key = text(migrationKey, 120);
  if (!key) return { error: "Érvénytelen importazonosító.", status: 400 };
  const legacy = snapshot(rawSnapshot);
  if ("error" in legacy) return legacy;
  const trip = await tripId();
  if ("error" in trip) return trip;
  const supabase = timelineServerClient();
  const { data: existing, error: existingError } = await supabase.from("notebook_legacy_imports").select("id").eq("trip_id", trip.data).eq("migration_key", key).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { data: { imported: false } };

  const packingRows = legacy.data.packing.map((item, position) => ({ trip_id: trip.data, title: text(item?.name, 160), is_packed: Boolean(item?.checked), position, legacy_source_id: `${key}:packing:${position}` })).filter((item) => item.title);
  const entryRows = [
    ...legacy.data.expenses.map((item, index) => ({ trip_id: trip.data, kind: "expense" as const, content: text(item?.name, 2000), amount_eur: Number(item?.amount), occurred_on: item?.date, rating: null, legacy_source_id: `${key}:expense:${index}` })),
    ...legacy.data.journal.map((item, index) => ({ trip_id: trip.data, kind: "journal" as const, content: text(item?.note, 2000), amount_eur: null, occurred_on: item?.date, rating: Number(item?.rating), legacy_source_id: `${key}:journal:${index}` })),
  ].filter((item) => item.content && validDate(item.occurred_on) && (item.kind !== "expense" || Number.isFinite(item.amount_eur) && item.amount_eur >= 0) && (item.kind !== "journal" || Number.isInteger(item.rating) && item.rating >= 1 && item.rating <= 5));
  if (packingRows.length) {
    const { error } = await supabase.from("packing_items").upsert(packingRows, { onConflict: "trip_id,legacy_source_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  if (entryRows.length) {
    const { error } = await supabase.from("notebook_entries").upsert(entryRows, { onConflict: "trip_id,legacy_source_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  const { error } = await supabase.from("notebook_legacy_imports").insert({ trip_id: trip.data, migration_key: key });
  if (error?.code === "23505") return { data: { imported: false } };
  if (error) throw error;
  return { data: { imported: true } };
}
