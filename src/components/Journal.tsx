"use client";

import type { JournalEntry } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLiveClock } from "@/hooks/useLiveClock";
import { fmtDate } from "@/lib/time";

export function Journal() {
  const now = useLiveClock();
  const { value: entries, setValue: setEntries } = useLocalStorage<JournalEntry[]>("journal", []);

  function addEntry() {
    const note = window.prompt("Mi történt ma? (rövid jegyzet)");
    if (!note) return;
    const ratingStr = window.prompt("Hányas napot adnál (1–5)?", "5");
    const rating = Math.min(5, Math.max(1, parseInt(ratingStr ?? "5", 10) || 5));
    setEntries((prev) => [...prev, { date: now.dateStr, note, rating }]);
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {entries.length === 0 && (
          <p className="text-sm text-neutral-700">Még nincs napló-bejegyzés.</p>
        )}
        {entries
          .slice()
          .reverse()
          .map((en, i) => (
            <div key={i} className="rounded-s bg-white p-3.5 shadow-sm">
              <p className="mb-1.5 font-mono text-[11px] text-neutral-700">{fmtDate(en.date)}</p>
              <p className="text-[14.5px] leading-relaxed text-deep-sea">{en.note}</p>
              {en.rating > 0 && (
                <p className="mt-1.5 text-sm" style={{ color: "#C6A56A" }}>
                  {"★".repeat(en.rating)}
                  {"☆".repeat(5 - en.rating)}
                </p>
              )}
            </div>
          ))}
      </div>
      <button
        onClick={addEntry}
        className="mt-3 font-mono text-[13px] font-semibold text-turquoise"
      >
        + Új bejegyzés a mai napról
      </button>
    </>
  );
}
