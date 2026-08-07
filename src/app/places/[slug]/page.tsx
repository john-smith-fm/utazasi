import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/PlaceDetail";
import { getPlaceBySlug } from "@/lib/places";

const PLACE_LIST_DESTINATION = {
  beach: { href: "/beaches", label: "Vissza a Strandokhoz" },
  restaurant: { href: "/restaurants", label: "Vissza az Éttermekhez" },
} as const;

export default function PlaceDetailPage({ params }: { params: { slug: string } }) {
  const place = getPlaceBySlug(params.slug);
  if (!place) notFound();
  const destination = PLACE_LIST_DESTINATION[place.type as keyof typeof PLACE_LIST_DESTINATION] ?? { href: "/", label: "Vissza a kezdőlapra" };

  return <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+12px)]">
    <Link href={destination.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-deep-sea/70 outline-none focus-visible:ring-2 focus-visible:ring-turquoise-dark">{destination.label}</Link>
    <div className="mt-5"><PlaceDetail place={place} /></div>
  </main>;
}
