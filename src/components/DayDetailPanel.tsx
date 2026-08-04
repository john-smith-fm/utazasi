import type { Day } from "@/types";
import { fmtDate, dayOfWeekLong } from "@/lib/time";
import { typeClass, typeLabel } from "@/lib/day-helpers";
import { PlanList } from "./PlanList";

const TAG_COLOR: Record<string, string> = {
  strand: "#4CB8C4",
  apartman: "#708A64",
  utazas: "#F18C79",
};

export function DayDetailPanel({ day }: { day: Day }) {
  const cls = typeClass(day.type);

  return (
    <div>
      <div className="mb-4">
        <span
          className="inline-block font-mono text-[10px] uppercase tracking-wide"
          style={{ color: TAG_COLOR[cls] }}
        >
          {typeLabel(day.type)}
        </span>
        <p className="mt-1 font-display text-2xl font-semibold text-deep-sea">
          {fmtDate(day.date)} {dayOfWeekLong(day.date)} · {day.title}
        </p>
        <p className="mb-1 mt-2 text-[15px] leading-relaxed text-neutral-700">{day.mood}</p>
      </div>
      <div className="rounded-m bg-white p-5 shadow-card">
        <PlanList day={day} highlightNow />
      </div>
    </div>
  );
}
