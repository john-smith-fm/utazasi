"use client";

import { useEffect, useRef } from "react";
import { DAYS } from "@/data/days";
import { pad } from "@/lib/time";

interface DayPickerProps {
  activeDate: string;
  onSelect: (date: string) => void;
  sticky?: boolean;
}

export function DayPicker({ activeDate, onSelect, sticky = false }: DayPickerProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeDate]);

  return (
    <div
      className={
        sticky
          ? "sticky top-0 z-10 border-b bg-quartz pb-3 pt-2"
          : "pb-1 pt-1"
      }
      style={sticky ? { borderColor: "rgba(24,50,59,0.10)" } : undefined}
    >
      <div
        aria-label="Utazás napjai"
        className="no-scrollbar flex h-[88px] snap-x snap-mandatory items-center gap-3 overflow-x-auto px-[calc(50%-32px)]"
        style={{ scrollPaddingInline: "50%" }}
      >
        {DAYS.map((day) => {
          const d = new Date(day.date + "T12:00:00");
          const isActive = day.date === activeDate;
          return (
            <button
              key={day.date}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(day.date)}
              aria-current={isActive ? "date" : undefined}
              aria-label={`${pad(d.getDate())}. szeptember, ${day.title}`}
              className="flex h-16 w-16 shrink-0 snap-center flex-col items-center justify-center rounded-full transition-[transform,opacity,filter,background-color,box-shadow] duration-200 ease-out"
              style={
                isActive
                  ? {
                      transform: "scale(1)",
                      background: "rgba(250, 248, 243, 0.62)",
                      border: "1px solid rgba(255,255,255,0.5)",
                      boxShadow: "0 12px 30px rgba(24,50,59,0.13)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    }
                  : {
                      transform: "scale(0.78)",
                      opacity: 0.52,
                      filter: "blur(0.4px)",
                    }
              }
            >
              <span className="text-[23px] font-semibold leading-none tracking-[-0.04em] text-deep-sea">{d.getDate()}</span>
              <span className="mt-1 text-[11px] font-medium leading-none text-deep-sea/60">
                {d.toLocaleDateString("hu-HU", { weekday: "short" }).replace(".", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
