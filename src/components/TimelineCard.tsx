"use client";
import { DayPicker } from "./DayPicker";
import type { HomeDay } from "@/data/home-days";
import type { DayDisplayContext } from "@/lib/day-display-context";

export function TimelineCard({ day, days, context, statusSummary, onSelect }: { day: HomeDay; days: HomeDay[]; context: DayDisplayContext; statusSummary?: string; onSelect: (date: string) => void }) {
  return <section className="mt-[18px] text-center">
    <h1 className="mx-auto max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(20px,5.8vw,24px)] font-bold leading-[30px] tracking-[-.03em]">{context.title}</h1>
    <DayPicker activeDate={day.date} days={days} onSelect={onSelect} />
    <p className="mx-auto mt-2 w-[calc(100%-40px)] max-w-[350px] text-sm leading-[21px] text-deep-sea/60">{context.summary}</p>
    {statusSummary && <p className="mx-auto mt-2 w-[calc(100%-40px)] max-w-[350px] text-sm font-medium leading-[21px] text-deep-sea/75">{statusSummary}</p>}
  </section>;
}
