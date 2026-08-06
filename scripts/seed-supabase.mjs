import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// New Supabase projects use sb_secret_ keys. Keep the legacy variable as a
// local-only fallback so existing setups do not break during the transition.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedUserId = process.env.SUPABASE_SEED_USER_ID;

if (!url || !secretKey || !seedUserId) {
  throw new Error(
    "Seed requires NEXT_PUBLIC_SUPABASE_URL, server-only SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), and SUPABASE_SEED_USER_ID.",
  );
}

const seed = JSON.parse(await readFile(new URL("../supabase/seeds/test-day.json", import.meta.url), "utf8"));
const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: trip, error: tripError } = await supabase
  .from("trips")
  .upsert({ ...seed.trip, user_id: seedUserId }, { onConflict: "slug" })
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
