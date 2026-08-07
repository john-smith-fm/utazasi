import { PlaceListItem } from "@/components/PlaceListItem";
import { getPlacesByType } from "@/lib/places";

export default function RestaurantsPage() {
  const restaurants = getPlacesByType("restaurant");

  return (
    <div className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))]">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-turquoise-dark">
          Hol együnk
        </p>
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-deep-sea">Éttermek</h1>
      </header>
      <div className="mt-4">
        {restaurants.map((place) => (
          <PlaceListItem key={place.slug} place={place} href={`/places/${place.slug}`} />
        ))}
      </div>
    </div>
  );
}
