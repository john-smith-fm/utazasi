"use client";

import type { HomeActivity } from "@/data/home-days";

export function ActivityBottomSheet({ activity, onClose, onOpenEditor }: { activity: HomeActivity; onClose: () => void; onOpenEditor: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-end bg-deep-sea/35" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={`${activity.title} gyors szerkesztése`} onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-[430px] rounded-t-[28px] bg-quartz pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_18px_44px_rgba(43,41,38,.12),0_2px_8px_rgba(43,41,38,.05)]">
      <div className="mx-auto my-3 h-1.5 w-10 rounded-full bg-deep-sea/15" />
      <header className="flex items-start justify-between border-b border-deep-sea/10 px-5 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-deep-sea/55">{activity.time}</p>
          <h2 className="mt-1 truncate text-xl font-bold tracking-[-.02em]">{activity.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-s text-sm font-semibold text-deep-sea/60" aria-label="Bezárás">Bezárás</button>
      </header>
      <div className="px-5 py-5">
        {activity.place && <p className="text-sm leading-5 text-deep-sea/60">{activity.place}</p>}
        {activity.description && <p className="mt-2 text-sm leading-[21px] text-deep-sea/60">{activity.description}</p>}
        <button type="button" onClick={onOpenEditor} className="mt-5 flex min-h-11 w-full items-center justify-between rounded-s border border-coral bg-coral/10 px-4 text-left text-[15px] font-semibold text-deep-sea">Részletes szerkesztés <span aria-hidden="true">›</span></button>
      </div>
    </section>
  </div>;
}
