import type { Place, PlaceType } from "@/types/places";

const TYPE_LABEL: Record<PlaceType, string> = {
  beach: "Strand",
  restaurant: "Étterem",
  cafe: "Kávézó",
  playground: "Játszótér",
  shop: "Bolt",
  sight: "Látnivaló",
  parking: "Parkolás",
  other: "Hely",
};

function BeachAccessDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach" || !place.details.access) return null;
  const access = place.details.access;
  const facts = [
    access.characteristics?.join(" · "),
    access.serpentineRoad ? "Szerpentines megközelítés" : undefined,
    access.dirtRoad ? "Földutas megközelítés" : undefined,
    access.mainRoad ? "Főúti megközelítés" : undefined,
    access.coastalRoad ? "Part menti útvonal" : undefined,
    access.parkingNotes,
    access.notes,
  ].filter(Boolean);

  if (facts.length === 0) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="access-heading">
    <h2 id="access-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Megközelítés</h2>
    <ul className="mt-3 space-y-2 text-sm leading-[21px] text-deep-sea/70">
      {facts.map((fact) => <li key={fact}>{fact}</li>)}
    </ul>
  </section>;
}

export function PlaceDetail({ place }: { place: Place }) {
  const primaryImage = place.media?.[0];
  const hasCoordinates = place.location?.latitude !== undefined && place.location?.longitude !== undefined;
  const navigationHref = hasCoordinates ? `https://www.google.com/maps/dir/?api=1&destination=${place.location!.latitude},${place.location!.longitude}` : undefined;

  return <article>
    <header>
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-turquoise-dark">{TYPE_LABEL[place.type]}</p>
      <h1 className="mt-2 text-[clamp(28px,8vw,36px)] font-bold leading-[1.08] tracking-[-0.035em] text-deep-sea">{place.name}</h1>
      {place.location?.locality && <p className="mt-3 text-[15px] leading-5 text-deep-sea/60">{place.location.locality}</p>}
    </header>

    {primaryImage && <figure className="mt-7 overflow-hidden rounded-m bg-sand">
      <img src={primaryImage.src} alt={place.name} className="aspect-[4/3] w-full object-cover" />
      {primaryImage.attribution && <figcaption className="px-3 py-2 text-[11px] leading-4 text-deep-sea/55">{primaryImage.attribution}</figcaption>}
    </figure>}

    {(place.shortDescription || place.description) && <section className="mt-7" aria-labelledby="description-heading">
      <h2 id="description-heading" className="sr-only">Leírás</h2>
      {place.shortDescription && <p className="text-[17px] font-medium leading-[25px] text-deep-sea">{place.shortDescription}</p>}
      {place.description && <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{place.description}</p>}
    </section>}

    <div className="mt-8 space-y-8">
      <BeachAccessDetails place={place} />
      {navigationHref && <a href={navigationHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-s border border-turquoise bg-turquoise/10 px-4 text-sm font-semibold text-deep-sea">Navigáció megnyitása</a>}
    </div>
  </article>;
}
