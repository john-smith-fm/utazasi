import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Seed requires NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY.");
}

const seed = JSON.parse(await readFile(new URL("../supabase/seeds/test-day.json", import.meta.url), "utf8"));
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: trip, error: tripError } = await supabase
  .from("trips")
  .upsert(seed.trip, { onConflict: "slug" })
  .select("id")
  .single();
if (tripError) throw tripError;

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

console.log(`Seeded ${seed.day.date}: ${rows.length} timeline activities.`);
