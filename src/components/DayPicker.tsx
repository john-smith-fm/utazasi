"use client";

import { useEffect, useRef, useState } from "react";
import { DAYS } from "@/data/days";
import { pad } from "@/lib/time";

interface DayPickerProps {
  activeDate: string;
  onSelect: (date: string) => void;
  sticky?: boolean;
}

const ITEM_SPACING = 78;

export function DayPicker({ activeDate, onSelect, sticky = false }: DayPickerProps) {
  const activeIndex = Math.max(0, DAYS.findIndex((day) => day.date === activeDate));
  const position = useRef(activeIndex);
  const target = useRef(activeIndex);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const frame = useRef<number | null>(null);
  const [renderPosition, setRenderPosition] = useState(activeIndex);

  useEffect(() => {
    target.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    function render() {
      if (!dragging.current) {
        const force = (target.current - position.current) * 0.12;
        velocity.current = (velocity.current + force) * 0.82;
        position.current += velocity.current;

        if (Math.abs(target.current - position.current) < 0.001 && Math.abs(velocity.current) < 0.001) {
          position.current = target.current;
          velocity.current = 0;
        }
      }

      setRenderPosition(position.current);
      frame.current = requestAnimationFrame(render);
    }

    frame.current = requestAnimationFrame(render);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function selectDate(index: number) {
    const nextIndex = Math.max(0, Math.min(DAYS.length - 1, index));
    target.current = nextIndex;
    onSelect(DAYS[nextIndex].date);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    velocity.current = 0;
    lastX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const deltaX = event.clientX - lastX.current;
    lastX.current = event.clientX;
    position.current = Math.max(0, Math.min(DAYS.length - 1, position.current - deltaX / ITEM_SPACING));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    selectDate(Math.round(position.current));
  }

  return (
    <div
      className={sticky ? "sticky top-0 z-10 border-b bg-quartz py-2" : "py-1"}
      style={sticky ? { borderColor: "rgba(24,50,59,0.10)" } : undefined}
    >
      <div
        aria-label="Utazás napjai"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-[126px] select-none touch-none overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 h-[116px] w-0">
          {DAYS.map((day, index) => {
            const date = new Date(day.date + "T12:00:00");
            const distance = index - renderPosition;
            const absoluteDistance = Math.abs(distance);
            const focus = Math.max(0, 1 - absoluteDistance / 2);
            const scale = 0.72 + 0.78 * focus;
            const opacity = Math.max(0.2, 1 - absoluteDistance * 0.3);
            const blur = Math.min(3, absoluteDistance * 1.5);
            const isFocused = absoluteDistance < 0.5;

            return (
              <button
                key={day.date}
                type="button"
                aria-current={day.date === activeDate ? "date" : undefined}
                aria-label={`${pad(date.getDate())}. szeptember, ${day.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  selectDate(index);
                }}
                className="absolute top-5 w-[72px] text-center transition-none"
                style={{
                  left: distance * ITEM_SPACING,
                  transform: `translateX(-50%) scale(${scale})`,
                  opacity,
                  filter: `blur(${blur}px)`,
                  zIndex: Math.round((DAYS.length - absoluteDistance) * 10),
                }}
              >
                <span
                  className="flex flex-col items-center rounded-full px-0 py-3 transition-[background-color,box-shadow,border-color] duration-150"
                  style={
                    isFocused
                      ? {
                          background: "rgba(250, 248, 243, 0.58)",
                          border: "1px solid rgba(255,255,255,0.35)",
                          boxShadow: "0 12px 30px rgba(24,50,59,0.12)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                        }
                      : { border: "1px solid transparent" }
                  }
                >
                  <span className="text-[28px] font-bold leading-none tracking-[-0.04em] text-deep-sea">{date.getDate()}</span>
                  <span className="mt-1 text-[12px] font-medium leading-none text-deep-sea/60">
                    {date.toLocaleDateString("hu-HU", { weekday: "short" }).replace(".", "")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
