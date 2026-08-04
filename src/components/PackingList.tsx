"use client";

import type { PackingItem } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const DEFAULT_PACKING: PackingItem[] = [
  "Naptej (gyerek is)",
  "Kalapok",
  "Úszógumi / karúszó",
  "Strandtörülközők",
  "Napszemüvegek",
  "Utazási elsősegély-doboz",
  "Enikő kedvenc játékai",
  "Esti mesekönyv",
  "Konnektor-adapter (olasz)",
  "Gyógyszerek",
  "Fürdőruhák",
  "Strandjátékok (vödör, lapát)",
  "Alvópárna Enikőnek",
  "Repülős dokumentumok",
].map((name) => ({ name, checked: false }));

export function PackingList() {
  const { value: items, setValue: setItems } = useLocalStorage<PackingItem[]>(
    "packing",
    DEFAULT_PACKING
  );

  function toggle(idx: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it)));
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((it, i) => (
        <div
          key={it.name}
          onClick={() => toggle(i)}
          className="flex cursor-pointer items-center gap-3 border-b py-2.5 text-[15px]"
          style={{
            borderColor: "rgba(24,50,59,0.10)",
            color: it.checked ? "#6D6862" : "#18323B",
            textDecoration: it.checked ? "line-through" : undefined,
          }}
        >
          <span
            className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-2 text-xs"
            style={{
              borderColor: it.checked ? "#4CB8C4" : "rgba(24,50,59,0.10)",
              backgroundColor: it.checked ? "#4CB8C4" : "transparent",
              color: it.checked ? "#fff" : "transparent",
            }}
          >
            ✓
          </span>
          <span>{it.name}</span>
        </div>
      ))}
    </div>
  );
}
