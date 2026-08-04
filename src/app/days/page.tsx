"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DayPicker } from "@/components/DayPicker";
import { DayDetailPanel } from "@/components/DayDetailPanel";
import { currentOrNearestDay, findDay } from "@/lib/day-helpers";

function DaysScreenInner() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") ?? currentOrNearestDay().date;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const day = findDay(selectedDate) ?? currentOrNearestDay();

  return (
    <>
      <header className="mx-auto max-w-[640px] px-5 pb-1 pt-[calc(env(safe-area-inset-top)+20px)]">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-wider text-turquoise">
          Napról napra
        </p>
        <h1 className="font-display text-[32px] font-semibold text-deep-sea">Napok</h1>
      </header>
      <DayPicker activeDate={day.date} onSelect={setSelectedDate} sticky />
      <div className="mx-auto max-w-[640px] px-5 pb-10 pt-5">
        <DayDetailPanel day={day} />
      </div>
    </>
  );
}

export default function DaysPage() {
  return (
    <Suspense fallback={null}>
      <DaysScreenInner />
    </Suspense>
  );
}
