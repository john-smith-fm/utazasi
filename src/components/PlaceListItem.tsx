import Link from "next/link";
import type { Place, PlaceType } from "@/types/places";
import { getBeachCardFacts, getGenericPlaceCardFacts, getRestaurantCardFacts, getShopCardFacts } from "@/lib/place-facts";

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
  const beachFacts = getBeachCardFacts(place);
  const restaurantFacts = getRestaurantCardFacts(place);
  const shopFacts = getShopCardFacts(place);
  const genericFacts = getGenericPlaceCardFacts(place);
  const inlineFacts = beachFacts.length ? beachFacts : restaurantFacts.length ? restaurantFacts : shopFacts.length ? shopFacts : genericFacts;
  const content = <>
    <p className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-deep-sea">{place.name}</p>
    {meta && <p className="mt-1 text-sm leading-5 text-deep-sea/60">{meta}</p>}
    {inlineFacts.length ? <p className="mt-2 text-[13px] font-medium leading-[18px] text-deep-sea/70">{inlineFacts.join(" · ")}</p> : null}
    {place.shortDescription && <p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{place.shortDescription}</p>}
    {access && <p className="mt-2 text-[13px] leading-[18px] text-deep-sea/60">{access}</p>}
  </>;

  const className = "block min-h-11 border-b border-deep-sea/10 py-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-turquoise-dark";
  return href ? <Link href={href} className={className}>{content}</Link> : <article className={className}>{content}</article>;
}
