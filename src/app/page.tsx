"use client";

import { useRouter } from "next/navigation";
import { Hero } from "@/components/Hero";
import { StatRow } from "@/components/StatRow";
import { NowCard } from "@/components/NowCard";
import { TimelineCard } from "@/components/TimelineCard";
import { PlanList } from "@/components/PlanList";
import { NextPlaceCard } from "@/components/NextPlaceCard";
import { QuickGrid } from "@/components/QuickGrid";
import { SunCard } from "@/components/SunCard";
import { currentOrNearestDay } from "@/lib/day-helpers";
import { fmtDate, dayOfWeekShort } from "@/lib/time";
import { useLiveClock } from "@/hooks/useLiveClock";

export default function HomePage() {
  useLiveClock(); // csak azért, hogy a komponens percenként újra-renderelje magát
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
        <NowCard />
        <TimelineCard day={day} onSelect={goToDay} />

        <div className="mb-4 rounded-m bg-white p-5 shadow-card">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-wide text-neutral-700">Mai terv</p>
            <p className="font-mono text-[13px] text-neutral-700">
              {fmtDate(day.date)} {dayOfWeekShort(day.date)}
            </p>
          </div>
          <PlanList day={day} highlightNow />
        </div>

        <NextPlaceCard day={day} />
        <QuickGrid />
        <SunCard />
      </div>
    </>
  );
}
