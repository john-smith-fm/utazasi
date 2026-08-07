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

function accessSummary(place: Place) {
  if (place.details.kind !== "beach") return undefined;
  return place.details.access?.notes ?? place.details.access?.parkingNotes ?? place.details.access?.characteristics?.join(" · ");
}

export function PlaceListItem({ place, href }: { place: Place; href?: string }) {
  const meta = [place.location?.locality, TYPE_LABEL[place.type]].filter(Boolean).join(" · ");
  const access = accessSummary(place);
  const content = <>
    <p className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-deep-sea">{place.name}</p>
    {meta && <p className="mt-1 text-sm leading-5 text-deep-sea/60">{meta}</p>}
    {place.shortDescription && <p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{place.shortDescription}</p>}
    {access && <p className="mt-2 text-[13px] leading-[18px] text-deep-sea/60">{access}</p>}
  </>;

  const className = "block min-h-11 border-b border-deep-sea/10 py-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-turquoise-dark";
  return href ? <a href={href} className={className}>{content}</a> : <article className={className}>{content}</article>;
}
