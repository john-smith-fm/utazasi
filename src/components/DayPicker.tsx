"use client";

import { useEffect, useRef } from "react";
import { DAYS } from "@/data/days";
import { pad } from "@/lib/time";
import { typeClass } from "@/lib/day-helpers";

const DOT_COLOR: Record<string, string> = {
  strand: "#4CB8C4",
  apartman: "#708A64",
  utazas: "#F18C79",
};

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
          ? "sticky top-0 z-10 border-b bg-quartz px-5 pb-3.5 pt-2.5"
          : "px-0.5 pb-1 pt-1.5"
      }
      style={sticky ? { borderColor: "rgba(24,50,59,0.10)" } : undefined}
    >
      <div
        className="flex gap-3.5 overflow-x-auto pb-1 pt-1.5"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {DAYS.map((day) => {
          const d = new Date(day.date + "T12:00:00");
          const isActive = day.date === activeDate;
          return (
            <button
              key={day.date}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(day.date)}
              className="flex flex-shrink-0 flex-col items-center gap-1.5 transition-transform"
              style={{ scrollSnapAlign: "center", transform: isActive ? "scale(1.05)" : undefined }}
            >
              <span
                className="flex items-center justify-center rounded-full border font-mono transition-all"
                style={
                  isActive
                    ? {
                        width: 54,
                        height: 54,
                        fontSize: 18,
                        fontWeight: 700,
                        backgroundColor: "rgba(255,255,255,0.65)",
                        borderColor: "#4CB8C4",
                        borderWidth: 1.5,
                        color: "#2E8A93",
                        boxShadow: "0 8px 20px rgba(24,50,59,0.08)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                      }
                    : {
                        width: 42,
                        height: 42,
                        fontSize: 14,
                        backgroundColor: "#FFFFFF",
                        borderColor: "rgba(24,50,59,0.10)",
                        borderWidth: 1.5,
                        color: "#18323B",
                      }
                }
              >
                {pad(d.getDate())}
              </span>
              <span
                className="block h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: DOT_COLOR[typeClass(day.type)] }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
