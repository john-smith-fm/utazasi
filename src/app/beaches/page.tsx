import { getPlacesByType } from "@/lib/places";
import { BeachCard } from "@/components/BeachCard";

export default function BeachesPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-10">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wider text-turquoise">
          Hova menjünk fürdeni
        </p>
        <h1 className="font-display text-[32px] font-semibold text-deep-sea">Strandok</h1>
      </header>
      <div className="mt-5 flex flex-col gap-4">
        {getPlacesByType("beach").map((place) => (
          <BeachCard key={place.slug} place={place} />
        ))}
      </div>
    </div>
  );
}
