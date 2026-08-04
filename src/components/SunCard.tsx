"use client";

import { useLiveData } from "@/hooks/useLiveData";
import { Icon } from "./Icon";

export function SunCard() {
  const { weather } = useLiveData();

  return (
    <div className="mb-4 rounded-m bg-white p-5 shadow-card">
      <p className="mb-2.5 font-mono text-xs uppercase tracking-wide text-neutral-700">Nap</p>
      <div className="flex gap-6">
        <div className="flex items-center gap-2 font-mono text-[15px] text-deep-sea">
          <Icon name="sunrise" size={18} className="text-turquoise" />
          <span>{weather?.sunrise ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[15px] text-deep-sea">
          <Icon name="sunset" size={18} className="text-turquoise" />
          <span>{weather?.sunset ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
