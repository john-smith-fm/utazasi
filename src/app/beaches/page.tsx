import { getPlacesByType } from "@/lib/places";
import { PlaceListItem } from "@/components/PlaceListItem";

export default function BeachesPage() {
  const beaches = getPlacesByType("beach");

  return (
    <div className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-turquoise-dark">
          Hova menjünk fürdeni
        </p>
        <h1 className="font-display text-[32px] font-semibold text-deep-sea">Strandok</h1>
      </header>
      <div className="mt-4">
        {beaches.map((place) => (
          <PlaceListItem key={place.slug} place={place} />
        ))}
      </div>
    </div>
  );
}
