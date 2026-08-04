"use client";

import { RHYTHMS } from "@/data/rhythms";
import { findDay } from "@/lib/day-helpers";
import { pad, timeToMinutes } from "@/lib/time";
import { useLiveClock } from "@/hooks/useLiveClock";

export function NowCard() {
  const now = useLiveClock();
  const today = findDay(now.dateStr);

  let text = "Ma nincs villasimiusi program — élvezzétek a napot!";

  if (today) {
    const blocks = RHYTHMS[today.rhythm];
    let current = blocks[0];
    for (const b of blocks) {
      const start = timeToMinutes(b.time);
      if (start !== null && start <= now.hm) current = b;
    }
    const idx = blocks.indexOf(current);
    const next = blocks[idx + 1];
    text = `${current.label} — ${current.text}`;
    if (next) {
      const nextStart = timeToMinutes(next.time);
      if (nextStart !== null) {
        const diff = nextStart - now.hm;
        if (diff > 0 && diff <= 90) {
          text += ` Kb. ${diff} perc múlva: ${next.label.toLowerCase()}.`;
        }
      }
    }
  }

  return (
    <div
      className="mb-4 rounded-m p-5 text-quartz shadow-card"
      style={{ background: "linear-gradient(135deg, #4CB8C4 0%, #2E8A93 100%)" }}
    >
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-quartz/85">
        Mit csináljunk most?
      </p>
      <p className="mb-1.5 font-mono text-[34px] font-semibold">
        {pad(now.h)}:{pad(now.m)}
      </p>
      <p className="text-[17px] leading-snug">{text}</p>
    </div>
  );
}
