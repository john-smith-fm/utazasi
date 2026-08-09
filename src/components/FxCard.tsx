"use client";

import { useLiveData } from "@/hooks/useLiveData";

export function FxCard() {
  const { fx } = useLiveData();

  return (
    <div className="mb-4 rounded-m bg-white p-5 text-center shadow-card">
      <p className="mb-2.5 text-xs uppercase tracking-wide text-neutral-700">Árfolyam</p>
      <p className="my-1 text-[30px] font-semibold text-turquoise">
        {fx !== null ? `1 € ≈ ${fx} Ft` : "Nincs internet — nem elérhető"}
      </p>
      <p className="text-[12.5px] text-neutral-700">1 € jelenlegi értéke forintban</p>
    </div>
  );
}
