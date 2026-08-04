"use client";

import { useState } from "react";
import type { Day } from "@/types";
import { RHYTHMS } from "@/data/rhythms";
import { timeToMinutes } from "@/lib/time";
import { useLiveClock } from "@/hooks/useLiveClock";
import { Icon } from "./Icon";

interface PlanListProps {
  day: Day;
  highlightNow?: boolean;
}

export function PlanList({ day, highlightNow = false }: PlanListProps) {
  const now = useLiveClock();
  const [expanded, setExpanded] = useState<number | null>(null);
  const blocks = RHYTHMS[day.rhythm];

  let currentIdx = -1;
  if (highlightNow && day.date === now.dateStr) {
    currentIdx = 0;
    blocks.forEach((b, i) => {
      const start = timeToMinutes(b.time);
      if (start !== null && start <= now.hm) currentIdx = i;
    });
  }

  return (
    <div className="flex flex-col">
      {blocks.map((b, i) => {
        const isCurrent = i === currentIdx;
        const isExpanded = expanded === i;
        return (
          <div
            key={b.key}
            onClick={() => setExpanded(isExpanded ? null : i)}
            className="flex cursor-pointer items-start gap-3.5 border-t py-2.5 first:border-t-0"
            style={{ borderColor: "rgba(24,50,59,0.10)" }}
          >
            <span className="w-[52px] flex-shrink-0 pt-0.5 font-mono text-[13px] text-neutral-700">
              {b.time.split("–")[0].split("-")[0]}
            </span>
            <span
              className="mt-1.5 h-[9px] w-[9px] flex-shrink-0 rounded-full"
              style={{
                backgroundColor: isCurrent ? "#F18C79" : "#4CB8C4",
                boxShadow: isCurrent ? "0 0 0 4px rgba(241,140,121,0.20)" : undefined,
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[16px] font-semibold text-deep-sea">
                <Icon name={b.icon} size={15} />
                {b.label}
              </p>
              {isExpanded && (
                <p className="mt-1 text-[13.5px] leading-snug text-neutral-700">{b.text}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
