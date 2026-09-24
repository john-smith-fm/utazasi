"use client";

import type { ReactNode } from "react";
import { useActiveTrip } from "@/components/TripProvider";
import { TRIP_CORE } from "@/data/trip-core";

export function TripFeatureGate({ featureName, children }: { featureName: string; children: ReactNode }) {
  const { activeTrip, status } = useActiveTrip();
  if (!activeTrip) return <p className="py-12 text-center text-sm text-deep-sea/55">{status === "loading" ? "Az utazás betöltése…" : "Nincs aktív utazás."}</p>;
  if (activeTrip.slug === TRIP_CORE.slug) return <>{children}</>;

  return <section className="mx-auto flex min-h-[60dvh] max-w-[430px] flex-col items-center justify-center px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+20px)] text-center">
    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-turquoise">{activeTrip.name}</p>
    <h1 className="mt-3 text-2xl font-bold tracking-[-.035em] text-deep-sea">{featureName}</h1>
    <p className="mt-3 max-w-[310px] text-sm leading-6 text-deep-sea/60">Ez a menüpont megmaradt, de az új Triphez tartozó adatút még fejlesztés alatt áll. Villasimius adatait nem keverjük bele ebbe az utazásba.</p>
  </section>;
}
