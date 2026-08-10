import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");

if (!url || !secretKey) {
  throw new Error("Place-link backfill requires NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY.");
}

// A narrowly-scoped one-off content correction. Every row remains untouched
// unless it still has its original seed location and an empty Place link.
const corrections = [
  {
    seedKey: "initial-2026-09-02-flight-departure",
    currentLocationName: "Budapest Airport",
    placeSlug: "budapest-airport",
  },
  {
    seedKey: "initial-2026-09-08-library",
    currentLocationName: "Villaputzu",
    locationName: "Biblioteca Comunale Efisio Melis",
    placeSlug: "biblioteca-comunale-efisio-melis",
    currentDescription: null,
  },
  {
    seedKey: "initial-2026-09-11-marina",
    currentLocationName: "Marina di Villasimius",
    placeSlug: "marina-di-villasimius",
  },
  {
    seedKey: "initial-2026-09-13-poetto",
    currentLocationName: "Poetto",
    locationName: "Sam Beach — Poetto",
    currentDescription: "Poetto, Cagliari.",
    description: "Sam Beach, Poetto, Cagliari.",
    placeSlug: "sam-beach-poetto",
  },
  {
    seedKey: "initial-2026-09-13-lunch",
    currentLocationName: "Poetto",
    locationName: "Sam Beach — Poetto",
    currentDescription: null,
    placeSlug: "sam-beach-poetto",
  },
  {
    seedKey: "initial-2026-09-13-shower",
    currentLocationName: "Poetto",
    locationName: "Sam Beach — Poetto",
    currentDescription: "Konkrét stabilimento később.",
    description: "Sam Beach — Poetto.",
    placeSlug: "sam-beach-poetto",
  },
  {
    seedKey: "initial-2026-09-13-flight-arrival",
    currentLocationName: "Budapest Airport",
    placeSlug: "budapest-airport",
  },
];

const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

if (!apply) {
  console.log("Dry run only. Re-run with --apply to add the approved canonical Place links.");
  corrections.forEach((correction) => console.log(correction.seedKey + " → " + correction.placeSlug));
  process.exit(0);
}

let updated = 0;
let skipped = 0;

for (const correction of corrections) {
  const changes = {
    place_slug: correction.placeSlug,
    ...(correction.locationName ? { location_name: correction.locationName } : {}),
    ...(correction.description ? { description: correction.description } : {}),
  };

  let query = supabase
    .from("timeline_activities")
    .update(changes)
    .eq("seed_key", correction.seedKey)
    .is("place_slug", null)
    .eq("location_name", correction.currentLocationName);

  query = correction.currentDescription === null
    ? query.is("description", null)
    : correction.currentDescription
      ? query.eq("description", correction.currentDescription)
      : query;

  const { data, error } = await query.select("id");
  if (error) throw error;

  if ((data?.length ?? 0) === 1) updated += 1;
  else skipped += 1;
}

console.log("Place-link correction complete: " + updated + " updated, " + skipped + " untouched (already linked or family-edited).");
