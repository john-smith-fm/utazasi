if (process.argv.includes("--apply")) {
  throw new Error(
    "Automatic Place-link backfill is retired. It could overwrite an intentional family edit. Review and apply any future Place link through the app or a specifically approved, record-level maintenance task.",
  );
}

// Historical one-off correction candidates retained for review only.
// This script no longer changes runtime Timeline records.
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

console.log("Read-only historical Place-link report. Automatic runtime updates are disabled.");
corrections.forEach((correction) => console.log(correction.seedKey + " → " + correction.placeSlug));
