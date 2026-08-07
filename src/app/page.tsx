"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { PlanList } from "@/components/PlanList";
import { StatRow } from "@/components/StatRow";
import { SunCard } from "@/components/SunCard";
import { TimelineCard } from "@/components/TimelineCard";
import { HOME_DAYS } from "@/data/home-days";
import { useTimelineDay } from "@/hooks/useTimelineDay";

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(HOME_DAYS[1].date);
  const fallbackDay = HOME_DAYS.find((item) => item.date === selectedDate) ?? HOME_DAYS[0];
  const { day, status, retry } = useTimelineDay(selectedDate, fallbackDay);

  return <>
    <Hero />
    <main className="relative z-10 mx-auto -mt-7 max-w-[430px] pb-[126px]">
      <div className="px-5"><StatRow /></div>
      <SunCard />
      <div className="px-5">
        <TimelineCard day={day} onSelect={setSelectedDate} />
        <section className="mt-8"><PlanList activities={day.activities} status={status} onRetry={retry} /></section>
      </div>
    </main>
    <button type="button" disabled aria-label="Program hozzáadása a következő fejlesztési körben" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-40 grid h-[54px] w-[54px] place-items-center rounded-full bg-coral text-deep-sea shadow-[0_12px_28px_rgba(217,99,57,.28)] opacity-50"><Icon name="plus" size={24} strokeWidth={2} /></button>
  </>;
}
