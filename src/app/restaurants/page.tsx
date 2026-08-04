import { RESTAURANTS, PLAYGROUNDS } from "@/data/restaurants";
import { RestaurantCard } from "@/components/RestaurantCard";
import { PlaygroundCard } from "@/components/PlaygroundCard";

export default function RestaurantsPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-10">
      <header className="pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wider text-turquoise">
          Hol együnk
        </p>
        <h1 className="font-display text-[32px] font-semibold text-deep-sea">Éttermek</h1>
      </header>

      <div className="mt-5 flex flex-col gap-4">
        {RESTAURANTS.map((r) => (
          <RestaurantCard key={r.name} restaurant={r} />
        ))}
      </div>

      <p className="mb-2.5 mt-8 font-mono text-xs uppercase tracking-wide text-neutral-700">
        Játszóterek
      </p>
      <div className="flex flex-col gap-4">
        {PLAYGROUNDS.map((p) => (
          <PlaygroundCard key={p.name} playground={p} />
        ))}
      </div>
    </div>
  );
}
