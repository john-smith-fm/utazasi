import type { Day } from "@/types";
import { BEACHES } from "@/data/beaches";

interface NextPlaceCardProps {
  day: Day;
}

export function NextPlaceCard({ day }: NextPlaceCardProps) {
  if (!day.beach) return null;
  const beach = BEACHES.find((b) => b.name === day.beach);
  if (!beach) return null;

  return (
    <div className="mb-4 rounded-m bg-white p-5 shadow-card">
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-neutral-700">
        Következő hely
      </p>
      <p className="mb-2 font-display text-[21px] font-semibold text-deep-sea">{beach.name}</p>
      <div className="flex items-center justify-between gap-3">
        <p className="flex-1 text-sm text-neutral-700">
          {beach.sand} · {beach.waves}
        </p>
        <a
          href={beach.maps}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 whitespace-nowrap rounded-full bg-turquoise px-4 py-2.5 font-mono text-xs font-semibold text-white"
        >
          Megnyitás
        </a>
      </div>
    </div>
  );
}
