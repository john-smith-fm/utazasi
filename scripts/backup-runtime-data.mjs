import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TRIP_SLUG = "sardinia-family-2026";
const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const BACKUP_REQUEST_TIMEOUT_MS = 15_000;
const args = process.argv.slice(2);

function usage() {
  return [
    "Usage: npm run backup:runtime -- --output /safe/path/utazasi-runtime-YYYY-MM-DD.json",
    "",
    "Creates one read-only snapshot of the current family Trip outside this Git repository.",
    "It never restores, seeds, updates or deletes Supabase data.",
  ].join("\n");
}

function outputPathFromArgs(values) {
  const outputIndex = values.indexOf("--output");
  if (outputIndex < 0 || !values[outputIndex + 1]) throw new Error("A mentéshez kötelező a --output teljes fájlútvonal.\n\n" + usage());
  const requested = values[outputIndex + 1];
  if (!isAbsolute(requested)) throw new Error("A mentés helyét teljes fájlúttal add meg, a repón kívül.");
  if (!requested.endsWith(".json")) throw new Error("A mentés fájlneve .json végű legyen.");
  const output = resolve(requested);
  const pathWithinRepository = relative(REPOSITORY_ROOT, output);
  if (!pathWithinRepository.startsWith("..") && !isAbsolute(pathWithinRepository)) {
    throw new Error("A mentés nem kerülhet a Git repóba. Válassz azon kívüli könyvtárat.");
  }
  return output;
}

function requireEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("A mentéshez NEXT_PUBLIC_SUPABASE_URL és csak szerveroldali SUPABASE_SECRET_KEY szükséges.");
  return { url, key };
}

async function backupFetch(input, init = {}) {
  try {
    return await fetch(input, { ...init, signal: AbortSignal.timeout(BACKUP_REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new Error("A Supabase mentési kapcsolat 15 másodperc után sem válaszolt. Ellenőrizd a hálózatot vagy a DNS-t, majd futtasd újra.");
    }
    throw error;
  }
}

function readableQueryError(error) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : String(error ?? "");
  if (/fetch failed|network|enotfound|eai_again/i.test(message)) {
    return "A Supabase jelenleg nem érhető el a gépről. Ellenőrizd a hálózatot vagy a DNS-t, majd futtasd újra a mentést.";
  }
  return message || "A Supabase lekérdezése nem sikerült.";
}

async function selectOrThrow(supabase, table, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${readableQueryError(error)}`);
  return data ?? [];
}

async function readSnapshot(supabase) {
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("slug", TRIP_SLUG)
    .maybeSingle();
  if (tripError) throw new Error(`trips: ${readableQueryError(tripError)}`);
  if (!trip) throw new Error(`Az utazás nem található: ${TRIP_SLUG}`);

  const [days, packingItems, notebookEntries, legacyImports, events, eventSeries, pushSubscriptions] = await Promise.all([
    selectOrThrow(supabase, "days", supabase.from("days").select("*").eq("trip_id", trip.id).order("date")),
    selectOrThrow(supabase, "packing_items", supabase.from("packing_items").select("*").eq("trip_id", trip.id).order("position").order("created_at")),
    selectOrThrow(supabase, "notebook_entries", supabase.from("notebook_entries").select("*").eq("trip_id", trip.id).order("occurred_on").order("created_at")),
    selectOrThrow(supabase, "notebook_legacy_imports", supabase.from("notebook_legacy_imports").select("*").eq("trip_id", trip.id).order("created_at")),
    selectOrThrow(supabase, "events", supabase.from("events").select("*").eq("trip_id", trip.id).order("starts_at")),
    selectOrThrow(supabase, "event_series", supabase.from("event_series").select("*").eq("trip_id", trip.id).order("starts_at")),
    selectOrThrow(supabase, "push_subscriptions", supabase.from("push_subscriptions").select("*").eq("trip_id", trip.id).order("created_at")),
  ]);

  const dayIds = days.map((day) => day.id);
  const eventIds = events.map((event) => event.id);
  const [timelineActivities, eventWatchStates, eventChangeLog] = await Promise.all([
    dayIds.length
      ? selectOrThrow(supabase, "timeline_activities", supabase.from("timeline_activities").select("*").in("day_id", dayIds).order("start_time").order("created_at"))
      : [],
    eventIds.length
      ? selectOrThrow(supabase, "event_watch_states", supabase.from("event_watch_states").select("*").in("event_id", eventIds))
      : [],
    eventIds.length
      ? selectOrThrow(supabase, "event_change_log", supabase.from("event_change_log").select("*").in("event_id", eventIds).order("observed_at"))
      : [],
  ]);

  return {
    format: "utazasi-runtime-backup",
    version: 1,
    generated_at: new Date().toISOString(),
    trip_slug: TRIP_SLUG,
    restore_note: "Read-only snapshot. A restore kizárólag külön, emberileg jóváhagyott és rekord-szintű eljárással történhet.",
    tables: {
      trips: [trip],
      days,
      timeline_activities: timelineActivities,
      packing_items: packingItems,
      notebook_entries: notebookEntries,
      notebook_legacy_imports: legacyImports,
      events,
      event_series: eventSeries,
      event_watch_states: eventWatchStates,
      event_change_log: eventChangeLog,
      push_subscriptions: pushSubscriptions,
    },
  };
}

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const output = outputPathFromArgs(args);
  const { url, key } = requireEnvironment();
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: backupFetch },
  });
  const snapshot = await readSnapshot(supabase);

  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await chmod(output, 0o600);

  const counts = Object.fromEntries(Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length]));
  process.stdout.write(`Read-only backup created: ${output}\n${JSON.stringify(counts)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
