"use client";

import { useEffect, useRef } from "react";
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
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    target.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    function paint() {
      itemRefs.current.forEach((item, index) => {
        if (!item) return;

        const distance = index - position.current;
        const absoluteDistance = Math.abs(distance);
        const focus = Math.max(0, 1 - absoluteDistance / 2);
        const scale = 0.64 + 0.68 * focus;
        const glass = item.firstElementChild as HTMLElement | null;

        item.style.left = `${distance * ITEM_SPACING}px`;
        item.style.transform = `translateX(-50%) scale(${scale})`;
        item.style.opacity = `${Math.max(0.2, 1 - absoluteDistance * 0.3)}`;
        item.style.filter = `blur(${Math.min(2.4, absoluteDistance * 1.2)}px)`;
        item.style.zIndex = `${Math.round((DAYS.length - absoluteDistance) * 10)}`;

        if (glass) {
          const isFocused = absoluteDistance < 0.5;
          glass.style.background = isFocused ? "rgba(250, 248, 243, 0.56)" : "transparent";
          glass.style.borderColor = isFocused ? "rgba(255,255,255,0.35)" : "transparent";
          glass.style.boxShadow = isFocused ? "0 8px 22px rgba(24,50,59,0.10)" : "none";
          glass.style.backdropFilter = isFocused ? "blur(10px)" : "none";
          glass.style.setProperty("-webkit-backdrop-filter", isFocused ? "blur(10px)" : "none");
        }
      });
    }

    function render() {
      if (!dragging.current) {
        const force = (target.current - position.current) * 0.08;
        velocity.current = (velocity.current + force) * 0.84;
        position.current += velocity.current;

        if (Math.abs(target.current - position.current) < 0.001 && Math.abs(velocity.current) < 0.001) {
          position.current = target.current;
          velocity.current = 0;
        }
      }

      paint();
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

            return (
              <button
                key={day.date}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                aria-current={day.date === activeDate ? "date" : undefined}
                aria-label={`${pad(date.getDate())}. szeptember, ${day.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  selectDate(index);
                }}
                className="absolute top-6 w-[58px] text-center transition-none [will-change:transform,opacity,filter]"
                style={{
                  left: (index - activeIndex) * ITEM_SPACING,
                  transform: "translateX(-50%) scale(0.64)",
                }}
              >
                <span
                  className="flex flex-col items-center rounded-full border border-transparent px-0 py-2.5 [will-change:background,box-shadow]"
                >
                  <span className="text-[22px] font-bold leading-none tracking-[-0.04em] text-deep-sea">{date.getDate()}</span>
                  <span className="mt-1 text-[10px] font-medium leading-none text-deep-sea/60">
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
