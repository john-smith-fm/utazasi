"use client";

import { useEffect, useMemo, useState } from "react";
import { editorialFingerprint, type EditorialCopy, type EditorialCopyInput } from "@/lib/editorial-copy-contract";
import { storageGet, storageSet } from "@/lib/storage";

type CachedEditorialCopy = EditorialCopy & { fingerprint: string; createdAt: string };

function isCachedCopy(value: CachedEditorialCopy | null, fingerprint: string): value is CachedEditorialCopy {
  return Boolean(value && value.fingerprint === fingerprint && typeof value.title === "string" && value.title.length > 0 && value.title.length <= 62 && typeof value.subtitle === "string" && value.subtitle.length > 0 && value.subtitle.length <= 280);
}

/** Starts with safe deterministic copy. A completed server-side copy replaces it
 * only when it validates against the same compact fact fingerprint. */
export function useEditorialCopy(input: EditorialCopyInput, fallback: EditorialCopy) {
  const fingerprint = useMemo(() => editorialFingerprint(input), [input]);
  const cacheKey = `utazasi:editorial-copy:v2:${input.date}:${fingerprint}`;
  const [result, setResult] = useState<{ fingerprint: string; copy: EditorialCopy }>({ fingerprint, copy: fallback });

  useEffect(() => {
    let active = true;
    const cached = storageGet<CachedEditorialCopy | null>(cacheKey, null);
    if (isCachedCopy(cached, fingerprint)) {
      setResult({ fingerprint, copy: { title: cached.title, subtitle: cached.subtitle } });
      return () => { active = false; };
    }
    setResult({ fingerprint, copy: fallback });
    if (typeof navigator !== "undefined" && !navigator.onLine) return () => { active = false; };
    void fetch("/api/editorial-copy", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Editorial copy unavailable");
      return response.json() as Promise<{ copy?: EditorialCopy; fingerprint?: string }>;
    }).then((result) => {
      if (!active || result.fingerprint !== fingerprint || !result.copy) return;
      const next: CachedEditorialCopy = { ...result.copy, fingerprint, createdAt: new Date().toISOString() };
      storageSet(cacheKey, next);
      setResult({ fingerprint, copy: result.copy });
    }).catch(() => {
      // Deterministic copy remains visible; this enhancement is never blocking.
    });
    return () => { active = false; };
  }, [cacheKey, fallback, fingerprint, input]);

  // When the user changes day, never paint the prior day's copy for even one
  // frame. The deterministic brief is safe until cache/network resolution.
  return result.fingerprint === fingerprint ? result.copy : fallback;
}
