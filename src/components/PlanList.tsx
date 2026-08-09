"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { HomeActivity } from "@/data/home-days";
import type { TimelineLoadState } from "@/hooks/useTimelineDay";
import { getPlaceBySlug } from "@/lib/places";

const DELETE_THRESHOLD = 72;
const MAX_SWIPE = 92;
const DRAG_SNAP_MINUTES = 15;
const PIXELS_PER_SNAP = 36;

function timeToMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function minutesToTime(minutes: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function snappedTime(time: string, deltaY: number) {
  const original = timeToMinutes(time);
  if (original === null) return time;
  const slots = Math.round(deltaY / PIXELS_PER_SNAP);
  return minutesToTime(original + slots * DRAG_SNAP_MINUTES);
}

function hasConflict(activities: HomeActivity[], index: number) {
  const currentStart = timeToMinutes(activities[index].time);
  if (currentStart === null) return false;
  return activities.slice(0, index).some((activity) => {
    const start = timeToMinutes(activity.time);
    return start !== null && activity.durationMinutes !== undefined && start + activity.durationMinutes > currentStart;
  });
}

function displayTime(activity: HomeActivity) {
  return activity.time;
}

function TimelineMessage({ status, onRetry }: { status: TimelineLoadState; onRetry: () => void }) {
  if (status === "loading") return <p className="mb-4 text-center text-[13px] leading-[21px] text-deep-sea/55" role="status">Napi terv betöltése…</p>;
  if (status === "offline") return <p className="mb-4 text-center text-[13px] leading-[21px] text-deep-sea/55" role="status">Offline · az utolsó ismert napi terv látható.</p>;
  if (status === "error") return <div className="mb-4 flex items-center justify-between gap-3 rounded-ui-s border border-coral/20 bg-coral/5 px-3 py-2 text-[13px] leading-[18px] text-deep-sea/60" role="alert"><span>A napi terv most nem érhető el.</span><button type="button" onClick={onRetry} className="min-h-11 shrink-0 rounded-ui-s px-2 font-semibold text-deep-sea">Újrapróbálás</button></div>;
  return null;
}

function TimelineSkeleton() {
  return <ol className="relative m-0 list-none space-y-7 p-0 before:absolute before:bottom-6 before:left-[55px] before:top-4 before:w-px before:bg-deep-sea/10" aria-hidden="true">{[0, 1, 2].map((item) => <li key={item} className="grid grid-cols-[44px_1fr] gap-x-6"><span className="mt-1 h-4 w-9 rounded bg-deep-sea/10" /><span className="space-y-2"><span className="block h-5 w-32 rounded bg-deep-sea/10" /><span className="block h-4 w-44 rounded bg-deep-sea/10" /></span></li>)}</ol>;
}

function navigationHref(activity: HomeActivity) {
  if (!activity.placeSlug) return undefined;
  const place = getPlaceBySlug(activity.placeSlug);
  if (!place) return undefined;
  return place.navigation?.directionsUrl
    ?? place.navigation?.mapsUrl
    ?? (place.location?.latitude !== undefined && place.location?.longitude !== undefined
      ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`
      : undefined);
}

function TimelineContent({ activity, conflict }: { activity: HomeActivity; conflict: boolean }) {
  const travel = activity.kind === "travel";
  const mapsHref = navigationHref(activity);
  return <article className={`min-w-0 ${activity.localEvent ? "-mt-2 rounded-[16px] bg-coral/10 p-3" : travel || activity.isSystemGenerated ? "opacity-65" : ""}`}>
    {activity.localEvent && <span className="mb-2 inline-flex rounded-full bg-coral/15 px-2 py-1 text-[11px] font-bold text-coral">Helyi esemény</span>}
    <h2 className={`text-[17px] font-bold leading-[23px] ${activity.localEvent ? "text-coral" : "text-deep-sea"}`}>{activity.title}</h2>
    {activity.place && (mapsHref
      ? <a href={mapsHref} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} className="mt-1 inline-flex min-h-6 items-center text-sm leading-5 text-turquoise-dark underline decoration-turquoise/40 underline-offset-2">{activity.place}<span className="sr-only"> navigáció megnyitása</span></a>
      : <p className="mt-1 text-sm leading-5 text-deep-sea/60">{activity.place}</p>)}
    {activity.description && <p className="mt-1 text-sm leading-[21px] text-deep-sea/60">{activity.description}</p>}
    {activity.recommendation && <p className="mt-2 text-[13px] leading-[18px] text-turquoise-dark">Ajánlott · {activity.recommendation}</p>}
    {activity.localEvent && activity.eventNote && <p className="mt-1 text-xs leading-[18px] text-deep-sea/60">{activity.eventNote}</p>}
    {conflict && <p className="mt-1 text-[12px] font-medium leading-[18px] text-coral/85" role="status">Időütközés · Átfed egy korábbi programmal.</p>}
  </article>;
}

function DragHandle({ activity, onPreview, onCommit, onError }: { activity: HomeActivity; onPreview: (time: string | null) => void; onCommit: (time: string) => Promise<void>; onError: (message: string) => void }) {
  const startY = useRef<number | null>(null);
  const proposedTime = useRef(activity.time);
  const [dragging, setDragging] = useState(false);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    startY.current = event.clientY;
    proposedTime.current = activity.time;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (startY.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    const nextTime = snappedTime(activity.time, event.clientY - startY.current);
    proposedTime.current = nextTime;
    onPreview(nextTime);
  }

  async function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (startY.current === null) return;
    event.preventDefault();
    event.stopPropagation();
    startY.current = null;
    setDragging(false);
    onPreview(null);
    if (cancelled || proposedTime.current === activity.time) return;
    try {
      await onCommit(proposedTime.current);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Az időpont módosítása nem sikerült.");
    }
  }

  return <button
    type="button"
    aria-label="Időpont módosítása"
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={(event) => { void finish(event); }}
    onPointerCancel={(event) => { void finish(event, true); }}
    onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    className={`absolute -right-2 -top-2 grid h-11 w-11 touch-none place-items-center text-deep-sea/30 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-turquoise-dark ${dragging ? "opacity-100" : "opacity-60"}`}
  >
    <span aria-hidden="true" className="grid gap-1">
      <span className="h-px w-3 rounded-full bg-current" />
      <span className="h-px w-3 rounded-full bg-current" />
      <span className="h-px w-3 rounded-full bg-current" />
    </span>
  </button>;
}

function EditableTimelineItem({ activity, conflict, onSelect, onDelete, onPreview, onTimeChange, onError }: { activity: HomeActivity; conflict: boolean; onSelect: (activity: HomeActivity) => void; onDelete: (activity: HomeActivity) => void; onPreview: (time: string | null) => void; onTimeChange: (activity: HomeActivity, time: string) => Promise<void>; onError: (message: string) => void }) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const suppressClick = useRef(false);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    start.current = { x: event.clientX, y: event.clientY };
    horizontal.current = false;
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const deltaX = event.clientX - start.current.x;
    const deltaY = event.clientY - start.current.y;
    if (!horizontal.current && Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (deltaX >= 0 && !horizontal.current) return;
    horizontal.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextOffset = Math.max(-MAX_SWIPE, Math.min(0, deltaX));
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }

  function pointerEnd() {
    if (!start.current) return;
    const shouldDelete = offsetRef.current <= -DELETE_THRESHOLD;
    suppressClick.current = horizontal.current;
    start.current = null;
    horizontal.current = false;
    offsetRef.current = 0;
    setOffset(0);
    if (shouldDelete) onDelete(activity);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(activity);
    }
  }

  return <div className="relative overflow-hidden">
    <button type="button" onClick={() => onDelete(activity)} className="absolute inset-y-0 right-0 grid w-[84px] place-items-center bg-error/15 text-[13px] font-semibold text-error" aria-label={`${activity.title} törlése`}>Törlés</button>
    <div role="button" tabIndex={0} aria-label={`${activity.title} szerkesztése`} onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onSelect(activity); }} className="relative cursor-pointer touch-pan-y bg-quartz outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-turquoise-dark" style={{ transform: `translateX(${offset}px)`, transitionDuration: start.current ? "0ms" : undefined }}>
      <div className="relative pr-11">
        <TimelineContent activity={activity} conflict={conflict} />
        <DragHandle activity={activity} onPreview={onPreview} onCommit={(time) => onTimeChange(activity, time)} onError={onError} />
      </div>
    </div>
  </div>;
}

export function PlanList({ activities, status, canEdit, onRetry, onSelect, onDelete, onTimeChange, onError }: { activities: HomeActivity[]; status: TimelineLoadState; canEdit: boolean; onRetry: () => void; onSelect: (activity: HomeActivity) => void; onDelete: (activity: HomeActivity) => void; onTimeChange: (activity: HomeActivity, time: string) => Promise<void>; onError: (message: string) => void }) {
  const showSkeleton = status === "loading" && activities.length === 0;
  const showEmpty = status === "empty" && activities.length === 0;
  const [previewTimes, setPreviewTimes] = useState<Record<string, string>>({});

  return <section aria-label="Napi idővonal" aria-busy={status === "loading"}>
    <TimelineMessage status={status} onRetry={onRetry} />
    {showSkeleton ? <TimelineSkeleton /> : showEmpty ? <p className="py-10 text-center text-sm leading-[21px] text-deep-sea/60">Erre a napra még nincs program.</p> : <ol className="relative m-0 list-none p-0 before:absolute before:bottom-6 before:left-[55px] before:top-4 before:w-px before:bg-deep-sea/10">
      {activities.map((activity, index) => {
        const travel = activity.kind === "travel";
        const editable = canEdit && Boolean(activity.id) && !travel && !activity.isSystemGenerated && !activity.localEvent;
        const conflict = hasConflict(activities, index);
        return <li key={activity.id ?? `${activity.time}-${activity.title}-${index}`} className="relative mb-7 grid grid-cols-[44px_1fr] gap-x-6">
          <time className={`pt-0.5 text-[13px] leading-[21px] ${activity.id && previewTimes[activity.id] ? "font-semibold text-turquoise-dark" : travel || activity.isSystemGenerated ? "text-deep-sea/35" : "text-deep-sea/55"}`}>{activity.id && previewTimes[activity.id] ? previewTimes[activity.id] : displayTime(activity)}</time>
          <span aria-hidden="true" className={`absolute left-[51px] top-2 h-[9px] w-[9px] rounded-full border-2 border-quartz ${activity.localEvent ? "bg-coral shadow-[0_0_0_4px_rgba(241,140,121,.14)]" : travel ? "bg-deep-sea/30" : "bg-turquoise shadow-[0_0_0_1px_rgba(20,127,145,.25)]"}`} />
          {editable ? <EditableTimelineItem activity={activity} conflict={conflict} onSelect={onSelect} onDelete={onDelete} onPreview={(time) => { if (!activity.id) return; setPreviewTimes((current) => { const next = { ...current }; if (time) next[activity.id!] = time; else delete next[activity.id!]; return next; }); }} onTimeChange={onTimeChange} onError={onError} /> : <TimelineContent activity={activity} conflict={conflict} />}
        </li>;
      })}
    </ol>}
  </section>;
}
