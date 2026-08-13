"use client";

import { useEffect, useState } from "react";
import type { WatchChange } from "@/lib/event-watch-service";

export function useEventWatch(date: string) {
  const [change, setChange] = useState<WatchChange | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/watch?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ change: WatchChange | null }> : { change: null })
      .then((result) => { if (active) setChange(result.change); })
      .catch(() => { if (active) setChange(null); });
    return () => { active = false; };
  }, [date]);

  return change;
}
