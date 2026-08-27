import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PlaceDetail } from "@/components/PlaceDetail";
import { PLACE_BROWSE_CATEGORIES, placeBrowseHref, validPlaceBrowseCategoryForType } from "@/lib/place-categories";
import { getPlaceBySlug } from "@/lib/places";

export default function PlaceDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: { category?: string } }) {
  const place = getPlaceBySlug(params.slug);
  if (!place) notFound();
  const category = validPlaceBrowseCategoryForType(place.type, searchParams?.category);
  const categoryLabel = PLACE_BROWSE_CATEGORIES.find((item) => item.id === category)?.label;
  const destination = { href: placeBrowseHref(category), label: categoryLabel ? `Vissza a ${categoryLabel}hoz` : "Vissza a Helyekhez" };

  return <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+12px)]">
    <Link href={destination.href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-turquoise bg-transparent px-4 text-sm font-semibold text-deep-sea outline-none transition-colors hover:bg-turquoise/10 focus-visible:ring-2 focus-visible:ring-turquoise-dark">
      <Icon name="arrow-left" size={16} aria-hidden="true" />
      {destination.label}
    </Link>
    <div className="mt-5"><PlaceDetail place={place} /></div>
  </main>;
}
