"use client";

import { useRouter } from "next/navigation";
import { Hero } from "@/components/Hero";
import { StatRow } from "@/components/StatRow";
import { TimelineCard } from "@/components/TimelineCard";
import { PlanList } from "@/components/PlanList";
import { NextPlaceCard } from "@/components/NextPlaceCard";
import { QuickGrid } from "@/components/QuickGrid";
import { SunCard } from "@/components/SunCard";
import { currentOrNearestDay } from "@/lib/day-helpers";

export default function HomePage() {
  const router = useRouter();
  const day = currentOrNearestDay();

  function goToDay(date: string) {
    router.push(`/days?date=${date}`);
  }

  return (
    <>
      <Hero />
      <div className="mx-auto max-w-[640px] px-5 pb-10 pt-0">
        <StatRow />
        <TimelineCard day={day} onSelect={goToDay} />

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
