"use client";

import Link from "next/link";
import type { Day } from "@/types";
import { dayIndexLabel } from "@/lib/day-helpers";
import { DayPicker } from "./DayPicker";
import { Icon } from "./Icon";

interface TimelineCardProps {
  day: Day;
  onSelect: (date: string) => void;
}

export function TimelineCard({ day, onSelect }: TimelineCardProps) {
  return (
    <section className="mb-7">
      <div className="mb-2 flex items-start justify-between px-1">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-[0.02em] text-deep-sea/55">
            Journey
          </p>
          <p className="font-display text-[22px] font-semibold tracking-[-0.03em] text-deep-sea">
            {dayIndexLabel(day)} · {day.title}
          </p>
        </div>
        <Link
          href="/days"
          aria-label="Napok megnyitása"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-deep-sea shadow-card transition-transform duration-200 active:scale-95"
        >
          <Icon name="arrow-up-right" size={17} strokeWidth={1.8} />
        </Link>
      </div>
      <DayPicker activeDate={day.date} onSelect={onSelect} />
    </section>
  );
}
