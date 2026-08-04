"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { StatRow } from "@/components/StatRow";
import { TimelineCard } from "@/components/TimelineCard";
import { PlanList } from "@/components/PlanList";
import { NextPlaceCard } from "@/components/NextPlaceCard";
import { QuickGrid } from "@/components/QuickGrid";
import { SunCard } from "@/components/SunCard";
import { currentOrNearestDay, findDay } from "@/lib/day-helpers";

export default function HomePage() {
  const initialDay = currentOrNearestDay();
  const [selectedDate, setSelectedDate] = useState(initialDay.date);
  const day = findDay(selectedDate) ?? initialDay;

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-[640px] px-5 pb-10 pt-0">
        <StatRow />
        <TimelineCard day={day} onSelect={setSelectedDate} />

        <section className="mb-7">
          <p className="mb-3 px-1 text-[11px] font-medium tracking-[0.02em] text-deep-sea/55">Today&apos;s journey</p>
          <PlanList day={day} highlightNow />
        </section>

        <NextPlaceCard day={day} />
        <QuickGrid />
        <SunCard />
      </div>
    </>
  );
}
