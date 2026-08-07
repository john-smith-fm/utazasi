import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/PlaceDetail";
import { getPlaceBySlug } from "@/lib/places";

export default function PlaceDetailPage({ params }: { params: { slug: string } }) {
  const place = getPlaceBySlug(params.slug);
  if (!place) notFound();

  return <main className="mx-auto max-w-[430px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+12px)]">
    <Link href="/beaches" className="inline-flex min-h-11 items-center text-sm font-semibold text-deep-sea/70 outline-none focus-visible:ring-2 focus-visible:ring-turquoise-dark">Vissza a Strandokhoz</Link>
    <div className="mt-5"><PlaceDetail place={place} /></div>
  </main>;
}
