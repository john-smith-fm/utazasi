import type { Place } from "@/types/places";

/** Temporary v2A compatibility view. Replaced by PlaceListItem in v2B. */
export function BeachCard({ place }: { place: Place }) {
  return <div className="rounded-m bg-white p-[18px_18px_20px] shadow-card">
    <p className="font-display text-[19px] font-semibold text-deep-sea">{place.name}</p>
    {place.location?.locality && <p className="mt-1 text-sm leading-5 text-neutral-700">{place.location.locality}</p>}
  </div>;
}
