"use client";

import { useEffect, useState } from "react";
import { nowInTrip, type TripNow } from "@/lib/time";

/** Élő óra a nyaralás időzónájában, 30 másodpercenként frissül. */
export function useLiveClock(intervalMs = 30000): TripNow {
  const [now, setNow] = useState<TripNow>(() => nowInTrip());

  useEffect(() => {
    setNow(nowInTrip()); // hydration után azonnal frissítünk
    const id = setInterval(() => setNow(nowInTrip()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
