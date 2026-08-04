"use client";

import Image from "next/image";
import { useState } from "react";
import type { Beach } from "@/types";
import { Icon } from "./Icon";

function Tag({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-1 font-mono text-[11px] text-neutral-700">
      <Icon name={icon} size={13} />
      {label}
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 border-t py-1.5 text-[13.5px] leading-snug first:border-t-0" style={{ borderColor: "rgba(24,50,59,0.10)" }}>
      <span className="w-[92px] flex-shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-wide text-neutral-700">
        {k}
      </span>
      <span className="flex-1">{v}</span>
    </div>
  );
}

export function BeachCard({ beach }: { beach: Beach }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="overflow-hidden rounded-m bg-white shadow-card">
      {!imgError && (
        <div className="relative h-[170px] w-full bg-sand">
          <Image
            src={beach.photo}
            alt={beach.name}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="p-[18px_18px_20px]">
        <p className="mb-1.5 font-display text-[19px] font-semibold text-deep-sea">{beach.name}</p>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {beach.umbrella && <Tag icon="umbrella" label="napernyő" />}
          {beach.sunbed && <Tag icon="bed" label="napágy" />}
          {beach.toilet && <Tag icon="toilet" label="WC" />}
          {beach.shower && <Tag icon="droplet" label="zuhany" />}
        </div>
        <Row k="Parkolás" v={beach.parking} />
        <Row k="Árak" v={beach.price} />
        <Row k="Hullámzás" v={beach.waves} />
        <Row k="Homok" v={beach.sand} />
        <Row k="Szél" v={beach.wind} />
        <Row k="Mikor menjünk" v={beach.goWhen} />
        <Row k="Mikor ne" v={beach.avoidWhen} />
        <Row k="Enikő-index" v={beach.enikoIndex} />
        <div className="mt-2.5 rounded-s bg-sand p-3 text-[13.5px] italic text-deep-sea">
          <b className="not-italic text-coral">Máté ajánlja:</b> {beach.mateAjanlja}
        </div>
        <a
          href={beach.maps}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-turquoise px-3.5 py-2 font-mono text-[12.5px] font-semibold text-turquoise"
        >
          <Icon name="map-pin" size={14} />
          Google Maps
        </a>
      </div>
    </div>
  );
}
