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

const { error: eventError } = await supabase
  .from("events")
  .upsert(eventRows, { onConflict: "trip_id,canonical_key" });
if (eventError) throw eventError;

console.log(`Seeded ${seed.day.date}: ${rows.length} timeline activities and ${eventRows.length} event(s).`);
