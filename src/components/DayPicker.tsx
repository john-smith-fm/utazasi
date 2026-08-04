"use client";

import { useEffect, useRef, useState } from "react";
import { DAYS } from "@/data/days";
import { pad } from "@/lib/time";

interface DayPickerProps {
  activeDate: string;
  onSelect: (date: string) => void;
  sticky?: boolean;
}

export function DayPicker({ activeDate, onSelect, sticky = false }: DayPickerProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndex = DAYS.findIndex((day) => day.date === activeDate);
  const [pickerPosition, setPickerPosition] = useState(Math.max(0, activeIndex));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    setPickerPosition(Math.max(0, activeIndex));
  }, [activeDate]);

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  function currentPickerPosition() {
    const picker = pickerRef.current;
    if (!picker) return null;

    const buttons = Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-date]"));
    const first = buttons[0];
    const second = buttons[1];
    if (!first || !second) return null;

    const center = picker.getBoundingClientRect().left + picker.clientWidth / 2;
    const firstCenter = first.getBoundingClientRect().left + first.clientWidth / 2;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    if (!step) return null;

    return Math.max(0, Math.min(DAYS.length - 1, (center - firstCenter) / step));
  }

  function selectCenteredDay() {
    const position = currentPickerPosition();
    if (position === null) return;
    const closest = DAYS[Math.round(position)];

    if (closest.date !== activeDate) onSelect(closest.date);
  }

  function handleScroll() {
    const position = currentPickerPosition();
    if (position !== null) setPickerPosition(position);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(selectCenteredDay, 90);
  }

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
        ref={pickerRef}
        aria-label="Utazás napjai"
        onScroll={handleScroll}
        className="no-scrollbar flex h-[88px] snap-x snap-mandatory items-center overflow-x-auto px-[40%]"
        style={{ scrollPaddingInline: "50%" }}
      >
        {DAYS.map((day) => {
          const d = new Date(day.date + "T12:00:00");
          const isActive = day.date === activeDate;
          const distance = Math.abs(DAYS.indexOf(day) - pickerPosition);
          const focus = Math.max(0, 1 - distance);
          return (
            <button
              key={day.date}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(day.date)}
              aria-current={isActive ? "date" : undefined}
              aria-label={`${pad(d.getDate())}. szeptember, ${day.title}`}
              data-date={day.date}
              className="flex h-16 basis-1/5 shrink-0 snap-center flex-col items-center justify-center rounded-full transition-[transform,opacity,filter,background-color,box-shadow] duration-200 ease-out"
              style={{
                transform: `scale(${0.7 + focus * 0.3})`,
                opacity: 0.28 + Math.max(0, 1 - distance / 2) * 0.72,
                filter: `blur(${Math.min(1.2, distance * 0.45)}px)`,
                background: `rgba(250, 248, 243, ${0.62 * focus})`,
                border: `1px solid rgba(255, 255, 255, ${0.5 * focus})`,
                boxShadow: `0 12px 30px rgba(24, 50, 59, ${0.13 * focus})`,
                backdropFilter: focus > 0.05 ? "blur(10px)" : "none",
                WebkitBackdropFilter: focus > 0.05 ? "blur(10px)" : "none",
              }}
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
