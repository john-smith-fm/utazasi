"use client";
import { DayPicker } from "./DayPicker";
import type { HomeDay } from "@/data/home-days";
import type { TripEvent } from "@/lib/event-types";
import { WatchNotificationControl } from "./WatchNotificationControl";

export function TimelineCard({ day, days, summary, events = [], onSelect }: { day: HomeDay; days: HomeDay[]; summary?: string; events?: TripEvent[]; onSelect: (date: string) => void }) {
  const hasWatchableEvent = events.some((event) => Boolean(event.sourceUrl && event.lastVerifiedAt));
  return <section className="mt-[18px] text-center">
    <h1 className="mx-auto max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(20px,5.8vw,24px)] font-bold leading-[30px] tracking-[-.03em]">{day.title}</h1>
    <DayPicker activeDate={day.date} days={days} onSelect={onSelect} />
    <p className="mx-auto mt-2 w-[calc(100%-40px)] max-w-[350px] text-sm leading-[21px] text-deep-sea/60">{summary ?? day.summary}</p>
    <WatchNotificationControl eligible={hasWatchableEvent} />
  </section>;
}
