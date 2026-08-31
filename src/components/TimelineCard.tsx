"use client";
import { DayPicker } from "./DayPicker";
import type { HomeDay } from "@/data/home-days";
import type { DayDisplayContext } from "@/lib/day-display-context";

export function TimelineCard({ day, days, context, onSelect }: { day: HomeDay; days: HomeDay[]; context: DayDisplayContext; onSelect: (date: string) => void }) {
  return <section className="mt-[18px] text-center">
    <h1 className="mx-auto max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(20px,5.8vw,24px)] font-bold leading-[30px] tracking-[-.03em]">{context.title}</h1>
    <DayPicker activeDate={day.date} days={days} onSelect={onSelect} />
    <p className="mx-auto mt-2 w-[calc(100%-40px)] max-w-[350px] text-sm leading-[21px] text-deep-sea/60">{context.summary}</p>
  </section>;
}
