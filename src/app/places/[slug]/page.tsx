import { notFound } from "next/navigation";
import { PlaceBackButton } from "@/components/PlaceBackButton";
import { PlaceDetail } from "@/components/PlaceDetail";
import { PLACE_BROWSE_CATEGORIES, placeBrowseHref, validPlaceBrowseCategoryForType } from "@/lib/place-categories";
import { getPlaceBySlug } from "@/lib/places";

function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export default function PlaceDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: { category?: string; returnTo?: string } }) {
  const place = getPlaceBySlug(params.slug);
  if (!place) notFound();
  const category = validPlaceBrowseCategoryForType(place.type, searchParams?.category);
  const categoryLabel = PLACE_BROWSE_CATEGORIES.find((item) => item.id === category)?.label;
  const destination = { href: placeBrowseHref(category), label: categoryLabel ? `Vissza a ${categoryLabel}hoz` : "Vissza a Helyekhez" };
  const returnTo = safeReturnTo(searchParams?.returnTo);

  return <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+12px)]">
    <PlaceBackButton fallbackHref={destination.href} returnTo={returnTo} label={returnTo ? "Vissza az eseményre" : destination.label} />
    <div className="mt-5"><PlaceDetail place={place} /></div>
  </main>;
}
