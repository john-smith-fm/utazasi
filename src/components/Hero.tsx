"use client";

import Image from "next/image";
import { useState } from "react";
import { TRIP } from "@/data/trip";
import { daysBetween } from "@/lib/time";
import { useLiveClock } from "@/hooks/useLiveClock";

export function Hero() {
  const now = useLiveClock();
  const [imgError, setImgError] = useState(false);

  const toStart = daysBetween(now.dateStr, TRIP.startDate);
  const toEnd = daysBetween(now.dateStr, TRIP.endDate);

  let countdown: string;
  if (toStart > 0) {
    countdown = toStart === 1 ? "Holnap indul a nyaralás" : `${toStart} nap az indulásig`;
  } else if (toEnd >= 0) {
    const dayNum = daysBetween(TRIP.startDate, now.dateStr) + 1;
    const totalDays = daysBetween(TRIP.startDate, TRIP.endDate) + 1;
    countdown = `${dayNum}. nap / ${totalDays} — itt vagytok Villasimiusban`;
  } else {
    countdown = "Hazaértetek — jó volt Villasimiusban";
  }

  return (
    <header className="relative flex h-[62vh] min-h-[420px] items-end overflow-hidden pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0">
        {!imgError ? (
          <Image
            src="/images/hero.jpg"
            alt="Villasimius"
            fill
            priority
            sizes="100vw"
            className="scale-[1.02] object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-turquoise to-deep-sea" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(24,50,59,0.05) 0%, rgba(24,50,59,0.15) 40%, rgba(24,50,59,0.92) 100%)",
          }}
        />
      </div>
      <div className="relative w-full px-6 pb-7 text-quartz">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wider text-turquoise/80">
          Villasimius · Szardínia
        </p>
        <h1 className="mb-2.5 font-display text-[44px] font-semibold leading-[0.98] text-quartz">
          Utazási
        </h1>
        <p className="font-mono text-sm text-quartz/85">{countdown}</p>
      </div>
    </header>
  );
}
