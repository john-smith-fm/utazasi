"use client";

import { storageGet, storageSet } from "@/lib/storage";
import type { LegacyNotebookSnapshot } from "@/lib/notebook-types";

const DEVICE_KEY = "notebook-legacy-device-v1";
const COMPLETED_KEY = "notebook-legacy-imported-v1";

function migrationKey() {
  const known = storageGet<string | null>(DEVICE_KEY, null);
  if (known) return known;
  const created = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  storageSet(DEVICE_KEY, created);
  return created;
}

/**
 * Called once by the future Notebook Shell before it switches to server data.
 * It never runs again after a successful response and is not an ongoing sync.
 */
export async function migrateLegacyNotebookOnce(): Promise<"migrated" | "already_migrated" | "skipped"> {
  if (storageGet<boolean>(COMPLETED_KEY, false)) return "already_migrated";
  const snapshot: LegacyNotebookSnapshot = {
    expenses: storageGet("expenses", []),
    packing: storageGet("packing", []),
    journal: storageGet("journal", []),
  };
  const hasLegacyData = snapshot.expenses.length > 0 || snapshot.packing.length > 0 || snapshot.journal.length > 0;
  if (!hasLegacyData) {
    storageSet(COMPLETED_KEY, true);
    return "skipped";
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Offline módban a régi Jegyzetfüzet-adatok még nem emelhetők át.");
  const response = await fetch("/api/notebook/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ migrationKey: migrationKey(), snapshot }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "A régi Jegyzetfüzet-adatok átemelése nem sikerült.");
  }
  const result = await response.json() as { imported: boolean };
  storageSet(COMPLETED_KEY, true);
  return result.imported ? "migrated" : "already_migrated";
}
