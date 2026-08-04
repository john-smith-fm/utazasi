"use client";

import { useEffect, useState, useCallback } from "react";
import { storageGet, storageSet } from "@/lib/storage";

/**
 * localStorage-hoz kötött state hook. SSR-biztos: a szerver-oldali és az első
 * kliens-oldali render mindig a `fallback`-et adja vissza, a valódi értéket
 * csak `useEffect`-ben (mountolás után) tölti be — így nincs hydration mismatch.
 */
export function useLocalStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(storageGet<T>(key, fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        storageSet(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return { value, setValue: update, hydrated };
}
