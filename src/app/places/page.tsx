import { Suspense } from "react";
import { PlacesBrowser } from "@/components/PlacesBrowser";
import { TripFeatureGate } from "@/components/TripFeatureGate";

export default function PlacesPage() {
  return (
    <TripFeatureGate featureName="Helyek">
      <Suspense fallback={<main className="mx-auto max-w-[430px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] text-deep-sea/60">Helyek betöltése…</main>}><PlacesBrowser /></Suspense>
    </TripFeatureGate>
  );
}
