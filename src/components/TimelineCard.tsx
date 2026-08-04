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
    <div className="mb-4 rounded-m bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-0.5 font-mono text-xs uppercase tracking-wide text-neutral-700">
            Trip timeline
          </p>
          <p className="mt-0.5 font-display text-[19px] font-semibold text-deep-sea">
            {dayIndexLabel(day)} · {day.title}
          </p>
        </div>
        <Link
          href="/days"
          aria-label="Napok megnyitása"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-sand"
        >
          <Icon name="arrow-up-right" size={18} />
        </Link>
      </div>
      <DayPicker activeDate={day.date} onSelect={onSelect} />
    </div>
  );
}
