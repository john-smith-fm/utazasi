import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New Supabase projects use sb_secret_ keys. Keep the legacy variable as a
// local-only fallback so existing setups do not break during the transition.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  throw new Error(
    "Seed requires NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).",
  );
}

const seed = JSON.parse(await readFile(new URL("../supabase/seeds/test-day.json", import.meta.url), "utf8"));
const eventDocument = JSON.parse(await readFile(new URL("../knowledge/events/events.json", import.meta.url), "utf8"));
const tripCore = JSON.parse(await readFile(new URL("../knowledge/trip/trip.public.json", import.meta.url), "utf8"));
const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

function localDateTimeParts(value) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a local ISO date and time, received: ${value}`);
  return { date: match[1], time: match[2] };
}

function durationBetween(start, end) {
  const startTime = Date.parse(`${start}:00+02:00`);
  const endTime = Date.parse(`${end}:00+02:00`);
  const duration = Math.round((endTime - startTime) / 60_000);
  if (duration < 1) throw new Error(`Invalid transport duration: ${start} → ${end}`);
  return duration;
}

function tripCoreActivities() {
  const outbound = tripCore.transport.outbound_flight;
  const inbound = tripCore.transport.return_flight;
  const checkIn = tripCore.accommodation.check_in;
  const checkOut = tripCore.accommodation.check_out;
  const outboundDeparture = localDateTimeParts(outbound.departure);
  const inboundDeparture = localDateTimeParts(inbound.departure);
  const checkInTime = localDateTimeParts(checkIn);
  const checkOutTime = localDateTimeParts(checkOut);

  return [
    {
      date: outboundDeparture.date,
      seed_key: "trip-core-outbound-flight",
      start_time: outboundDeparture.time,
      duration_minutes: durationBetween(outbound.departure, outbound.arrival),
      title: "Repülőút Cagliariba",
      description: `${outbound.provider} · ${outbound.from} → ${outbound.to}`,
      location_name: "Cagliari repülőtér",
      kind: "travel",
      is_system_generated: true,
    },
    {
      date: checkInTime.date,
      seed_key: "trip-core-accommodation-check-in",
      start_time: checkInTime.time,
      // The source records a check-in start time, but not its duration. Keep
      // this as a one-minute timeline marker rather than inventing a stay.
      duration_minutes: 1,
      title: "Szállás elfoglalása",
      description: "Check-in kezdete",
      location_name: tripCore.accommodation.name,
      kind: "plan",
      is_system_generated: true,
    },
    {
      date: checkOutTime.date,
      seed_key: "trip-core-accommodation-check-out",
      start_time: checkOutTime.time,
      // The source records a check-out start time, but not its duration.
      duration_minutes: 1,
      title: "Kijelentkezés a szállásról",
      description: "Check-out kezdete",
      location_name: tripCore.accommodation.name,
      kind: "plan",
      is_system_generated: true,
    },
    {
      date: inboundDeparture.date,
      seed_key: "trip-core-return-flight",
      start_time: inboundDeparture.time,
      duration_minutes: durationBetween(inbound.departure, inbound.arrival),
      title: "Hazarepülés Budapestre",
      description: `${inbound.provider} · ${inbound.from} → ${inbound.to}`,
      location_name: "Cagliari repülőtér",
      kind: "travel",
      is_system_generated: true,
    },
  ];
}

const { data: trip, error: tripError } = await supabase
  .from("trips")
  .upsert({
    slug: tripCore.slug,
    name: tripCore.name,
    destination: tripCore.destination.name,
    start_date: tripCore.dates.start,
    end_date: tripCore.dates.end,
  }, { onConflict: "slug" })
  .select("id")
  .single();
if (tripError) throw tripError;

const { error: coreDaysError } = await supabase
  .from("days")
  .upsert(tripCore.days.map((day) => ({ trip_id: trip.id, date: day.date, title: day.title, subtitle: day.subtitle })), { onConflict: "trip_id,date" });
if (coreDaysError) throw coreDaysError;

const { data: day, error: dayError } = await supabase
  .from("days")
  .upsert({ ...seed.day, trip_id: trip.id }, { onConflict: "trip_id,date" })
  .select("id")
  .single();
if (dayError) throw dayError;

const rows = seed.timeline_activities.map((activity) => ({ ...activity, day_id: day.id }));
const { error: activityError } = await supabase
  .from("timeline_activities")
  .upsert(rows, { onConflict: "seed_key" });
if (activityError) throw activityError;

const { data: coreDays, error: coreDaysLookupError } = await supabase
  .from("days")
  .select("id, date")
  .eq("trip_id", trip.id)
  .in("date", [...new Set(tripCoreActivities().map((activity) => activity.date))]);
if (coreDaysLookupError) throw coreDaysLookupError;

const dayIds = new Map(coreDays.map((coreDay) => [coreDay.date, coreDay.id]));
const coreActivityRows = tripCoreActivities().map(({ date, ...activity }) => {
  const dayId = dayIds.get(date);
  if (!dayId) throw new Error(`Trip Core day was not found for ${date}`);
  return { ...activity, day_id: dayId };
});
const { error: coreActivityError } = await supabase
  .from("timeline_activities")
  .upsert(coreActivityRows, { onConflict: "seed_key" });
if (coreActivityError) throw coreActivityError;

const eventRows = eventDocument.events.map((event) => ({
  trip_id: trip.id,
  canonical_key: event.id,
  title: event.title,
  starts_at: event.starts_at,
  ends_at: event.ends_at ?? null,
  organizer: event.organizer ?? null,
  source_url: event.source_url,
  status: event.status === "cancelled" ? "cancelled" : event.status === "changed" ? "changed" : "scheduled",
  place_slug: event.place_slug ?? null,
  last_verified_at: event.metadata?.verification?.last_checked ? `${event.metadata.verification.last_checked}T00:00:00+02:00` : null,
}));

const { data: seededEvents, error: eventError } = await supabase
  .from("events")
  .upsert(eventRows, { onConflict: "trip_id,canonical_key" })
  .select("id, source_url, status, starts_at, place_slug, last_verified_at");
if (eventError) throw eventError;

// The first verified canonical Event state is the Watch baseline. Existing
// Watch rows are deliberately never reset by a later seed run: once a Watch
// has observed a change, its runtime baseline belongs to the Watch service.
const watchBaselines = (seededEvents ?? [])
  .filter((event) => event.source_url && event.last_verified_at)
  .map((event) => ({
    event_id: event.id,
    enabled: true,
    baseline_status: event.status,
    baseline_starts_at: event.starts_at,
    baseline_place_slug: event.place_slug,
    last_checked_at: event.last_verified_at,
    last_success_at: event.last_verified_at,
  }));

if (watchBaselines.length > 0) {
  const { error: watchError } = await supabase
    .from("event_watch_states")
    .upsert(watchBaselines, { onConflict: "event_id", ignoreDuplicates: true });
  if (watchError) throw watchError;
}

console.log(`Seeded ${seed.day.date}: ${rows.length} daily activities, ${coreActivityRows.length} Trip Core markers, ${eventRows.length} event(s) and ${watchBaselines.length} Watch baseline(s).`);
