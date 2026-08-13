import { Suspense } from "react";
import { PlacesBrowser } from "@/components/PlacesBrowser";

export default function PlacesPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[430px] px-5 pt-[calc(env(safe-area-inset-top)+20px)] text-deep-sea/60">Helyek betöltése…</main>}>
      <PlacesBrowser />
    </Suspense>
  );
}
