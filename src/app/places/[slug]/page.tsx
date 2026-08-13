import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/PlaceDetail";
import { placeBrowseHref, validPlaceBrowseCategoryForType } from "@/lib/place-categories";
import { getPlaceBySlug } from "@/lib/places";

export default function PlaceDetailPage({ params, searchParams }: { params: { slug: string }; searchParams?: { category?: string } }) {
  const place = getPlaceBySlug(params.slug);
  if (!place) notFound();
  const category = validPlaceBrowseCategoryForType(place.type, searchParams?.category);
  const destination = { href: placeBrowseHref(category), label: "Vissza a Helyekhez" };

  return <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+12px)]">
    <Link href={destination.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-deep-sea/70 outline-none focus-visible:ring-2 focus-visible:ring-turquoise-dark">{destination.label}</Link>
    <div className="mt-5"><PlaceDetail place={place} /></div>
  </main>;
}
