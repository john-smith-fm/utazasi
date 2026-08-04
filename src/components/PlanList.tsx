"use client";

import { Fragment, useState } from "react";
import type { Day, RhythmBlock } from "@/types";
import { RHYTHMS } from "@/data/rhythms";
import { timeToMinutes, pad } from "@/lib/time";
import { useLiveClock } from "@/hooks/useLiveClock";

interface PlanListProps {
  day: Day;
  highlightNow?: boolean;
}

function eventType(block: RhythmBlock, day: Day): string | null {
  if (["umbrella", "waves"].includes(block.icon)) return day.beach ?? "Strand";
  if (["plane", "car", "route"].includes(block.icon)) return "Utazás";
  if (block.icon === "utensils") return "Étkezés";
  if (["moon", "moon-star", "home"].includes(block.icon)) return "Pihenő";
  return null;
}

function NowMarker({ time }: { time: string }) {
  return (
    <div className="relative grid grid-cols-[48px_18px_minmax(0,1fr)] gap-x-3 py-3">
      <span className="pt-0.5 text-right text-[11px] font-medium tabular-nums text-coral">{time}</span>
      <span className="relative flex justify-center">
        <span className="absolute top-1 h-3 w-3 rounded-full border-2 border-coral bg-quartz" />
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-coral/20 motion-safe:animate-pulse" />
      </span>
      <span className="pt-0.5 text-[10px] font-semibold tracking-[0.12em] text-coral">NOW</span>
    </div>
  );
}

export function PlanList({ day, highlightNow = false }: PlanListProps) {
  const now = useLiveClock();
  const [expanded, setExpanded] = useState<number | null>(null);
  const blocks = RHYTHMS[day.rhythm];
  const isToday = highlightNow && day.date === now.dateStr;

  let currentIdx = -1;
  if (isToday) {
    blocks.forEach((block, index) => {
      const start = timeToMinutes(block.time);
      if (start !== null && start <= now.hm) currentIdx = index;
    });
  }

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="absolute bottom-5 left-[69px] top-5 w-px bg-deep-sea/10"
      />

      {isToday && currentIdx === -1 && <NowMarker time={`${pad(now.h)}:${pad(now.m)}`} />}

      {blocks.map((block, index) => {
        const isCurrent = index === currentIdx;
        const isFuture = currentIdx !== -1 && index > currentIdx;
        const isExpanded = expanded === index;
        const category = eventType(block, day);

        return (
          <Fragment key={block.key}>
            <article
              className={`relative grid grid-cols-[48px_18px_minmax(0,1fr)] gap-x-3 py-2 transition-[opacity,transform] duration-300 ease-out ${
                isFuture ? "opacity-45" : "opacity-100"
              }`}
            >
              <time className="pt-3 text-right text-[12px] font-medium tabular-nums text-deep-sea/55">
                {block.time.split("–")[0].split("-")[0]}
              </time>

              <span className="relative flex justify-center pt-[18px]" aria-hidden="true">
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    isCurrent ? "bg-coral shadow-[0_0_0_5px_rgba(241,140,121,0.16)]" : "bg-turquoise"
                  }`}
                />
              </span>

              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setExpanded(isExpanded ? null : index)}
                className={`min-w-0 text-left transition-[background-color,box-shadow,transform] duration-300 ease-out ${
                  isCurrent
                    ? "rounded-[16px] border border-white/70 bg-white/55 px-4 py-3 shadow-glass backdrop-blur-[10px]"
                    : "px-0 py-2.5"
                }`}
              >
                <p className={`font-display font-semibold leading-tight tracking-[-0.025em] text-deep-sea ${isCurrent ? "text-[21px]" : "text-[17px]"}`}>
                  {block.label}
                </p>
                {category && <p className="mt-1 text-[11px] font-medium text-deep-sea/55">{category}</p>}
                {isExpanded && <p className="mt-2 text-[13px] leading-relaxed text-deep-sea/65">{block.text}</p>}
              </button>
            </article>

            {isToday && index === currentIdx && <NowMarker time={`${pad(now.h)}:${pad(now.m)}`} />}
          </Fragment>
        );
      })}
    </div>
  );
}
