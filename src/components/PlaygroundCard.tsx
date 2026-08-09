"use client";

import Image from "next/image";
import { useState } from "react";
import type { Playground } from "@/types";
import { Icon } from "./Icon";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 border-t py-1.5 text-[13.5px] leading-snug first:border-t-0" style={{ borderColor: "rgba(24,50,59,0.10)" }}>
      <span className="w-[92px] flex-shrink-0 pt-0.5 text-[11px] uppercase tracking-wide text-neutral-700">
        {k}
      </span>
      <span className="flex-1">{v}</span>
    </div>
  );
}

export function PlaygroundCard({ playground: p }: { playground: Playground }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="overflow-hidden rounded-m bg-white shadow-card">
      {!imgError && (
        <div className="relative h-[170px] w-full bg-sand">
          <Image src={p.photo} alt={p.name} fill className="object-cover" onError={() => setImgError(true)} />
        </div>
      )}
      <div className="p-[18px_18px_20px]">
        <p className="mb-1.5 text-[19px] font-semibold text-deep-sea">{p.name}</p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {p.fountain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-1 text-[11px] text-neutral-700">
              <Icon name="droplets" size={13} /> ivókút
            </span>
          )}
          {p.toilet && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-1 text-[11px] text-neutral-700">
              <Icon name="toilet" size={13} /> WC
            </span>
          )}
        </div>
        <Row k="Távolság" v={p.distance} />
        <Row k="Árnyék" v={p.shade} />
        <a
          href={p.maps}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-turquoise px-3.5 py-2 text-[12.5px] font-semibold text-turquoise"
        >
          <Icon name="map-pin" size={14} />
          Google Maps
        </a>
      </div>
    </div>
  );
}
