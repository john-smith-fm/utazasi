"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityEditor } from "@/components/ActivityEditor";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { PlanList } from "@/components/PlanList";
import { StatRow } from "@/components/StatRow";
import { SunCard } from "@/components/SunCard";
import { TimelineCard } from "@/components/TimelineCard";
import { NotificationPreference } from "@/components/NotificationPreference";
import { EventSuggestions } from "@/components/EventSuggestions";
import { type HomeActivity } from "@/data/home-days";
import { TRIP_CORE_DAYS } from "@/data/trip-core";
import { useTimelineDay, useTripTimeline } from "@/hooks/useTimelineDay";
import { useLiveData } from "@/hooks/useLiveData";
import { useCurrentLocationContext } from "@/hooks/useCurrentLocationContext";
import { useEventWatch } from "@/hooks/useEventWatch";
import { useTripEvents } from "@/hooks/useTripEvents";
import { createTimelineActivity, deleteTimelineActivity, updateTimelineActivity } from "@/lib/timeline-client";
import type { TimelineActivityInput, TimelineActivityRecord } from "@/lib/timeline-types";
import { smartStatusSummary } from "@/lib/smart-status";

type EditorState = { activity?: HomeActivity } | null;
type ToastState = { message: string; undo?: boolean } | null;
type UndoRecord = { activity: HomeActivity; date: string };

function toInput(activity: HomeActivity): TimelineActivityInput {
  return {
    title: activity.title,
    startTime: activity.time,
    durationMinutes: activity.durationMinutes ?? 60,
    locationName: activity.place,
    placeSlug: activity.placeSlug,
    description: activity.description ?? "",
  };
}

function toHomeActivity(activity: TimelineActivityRecord): HomeActivity {
  return {
    id: activity.id,
    time: activity.start_time.slice(0, 5),
    title: activity.title,
    place: activity.location_name ?? "",
    placeSlug: activity.place_slug,
    sourceEventId: activity.source_event_id,
    description: activity.description ?? undefined,
    durationMinutes: activity.duration_minutes,
    kind: activity.kind,
    isSystemGenerated: activity.is_system_generated,
  };
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(TRIP_CORE_DAYS[1].date);
  const [editor, setEditor] = useState<EditorState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const undoActivity = useRef<UndoRecord | null>(null);
  const undoTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  // The canonical Timeline lives in Supabase. Trip-core can provide a safe
  // offline day shell, but legacy prototype activities must never reappear.
  const fallbackDay = TRIP_CORE_DAYS.find((item) => item.date === selectedDate) ?? TRIP_CORE_DAYS[0];
  const { day, status, hasRemoteDay, canWrite, retry } = useTimelineDay(selectedDate, fallbackDay);
  const tripTimeline = useTripTimeline(TRIP_CORE_DAYS);
  const currentLocation = useCurrentLocationContext();
  const { weather, sea } = useLiveData(currentLocation.context);
  const watchChange = useEventWatch(selectedDate);
  const events = useTripEvents(selectedDate);
  const canMutate = canWrite;
  const statusSummary = smartStatusSummary(day, weather, watchChange);

  useEffect(() => {
    const requestedDate = new URLSearchParams(window.location.search).get("day");
    if (requestedDate && TRIP_CORE_DAYS.some((item) => item.date === requestedDate)) {
      setSelectedDate(requestedDate);
    }
  }, []);

  useEffect(() => () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  function showToast(message: string, undo = false) {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setToast({ message, undo });
    if (!undo) feedbackTimer.current = window.setTimeout(() => {
      setToast(null);
      feedbackTimer.current = null;
    }, 3500);
  }

  function startUndo(activity: HomeActivity) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    undoActivity.current = { activity, date: selectedDate };
    setToast({ message: "Esemény törölve", undo: true });
    undoTimer.current = window.setTimeout(() => {
      undoActivity.current = null;
      setToast(null);
      undoTimer.current = null;
    }, 5000);
  }

  async function save(input: TimelineActivityInput, requestId?: string) {
    if (editor?.activity?.id) await updateTimelineActivity(editor.activity.id, input);
    else await createTimelineActivity(selectedDate, input, requestId);
    setEditor(null);
    retry();
    tripTimeline.retry();
    showToast("Program mentve");
  }

  async function remove(activity: HomeActivity) {
    if (!activity.id) return;
    const deleted = await deleteTimelineActivity(activity.id);
    setEditor(null);
    retry();
    tripTimeline.retry();
    startUndo(toHomeActivity(deleted));
  }

  async function changeStartTime(activity: HomeActivity, startTime: string) {
    if (!activity.id) return;
    await updateTimelineActivity(activity.id, { ...toInput(activity), startTime });
    retry();
    tripTimeline.retry();
    showToast("Időpont módosítva");
  }

  async function undo() {
    const record = undoActivity.current;
    if (!record) return;
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = null;
    undoActivity.current = null;
    setToast(null);
    try {
      await createTimelineActivity(record.date, toInput(record.activity), record.activity.id);
      retry();
      tripTimeline.retry();
      showToast("Esemény visszaállítva");
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "A visszaállítás nem sikerült.");
    }
  }

  return <>
    <Hero />
    <main className="relative z-10 mx-auto -mt-7 max-w-[430px]">
      <div className="px-5"><StatRow weather={weather} sea={sea} day={day} events={events} tripDays={tripTimeline.days} tripStatus={tripTimeline.status} onOpenDay={setSelectedDate} /></div>
      <SunCard weather={weather} locationLabel={currentLocation.context.label} deviceState={currentLocation.deviceState} onRequestDeviceLocation={currentLocation.requestDeviceLocation} />
      <div className="px-5">
        <NotificationPreference />
        <TimelineCard day={day} days={TRIP_CORE_DAYS} summary={statusSummary} onSelect={setSelectedDate} />
        <EventSuggestions date={selectedDate} events={events} onAccepted={() => { retry(); tripTimeline.retry(); showToast("Esemény hozzáadva a napi tervhez"); }} />
        <section className="mt-8"><PlanList activities={day.activities} status={status} hasCachedDay={hasRemoteDay} canEdit={canMutate} onRetry={retry} onSelect={(activity) => setEditor({ activity })} onDelete={(activity) => { void remove(activity).catch((caught) => showToast(caught instanceof Error ? caught.message : "A törlés nem sikerült.")); }} onTimeChange={changeStartTime} onError={showToast} /></section>
        <div aria-hidden="true" className="h-12" />
      </div>
    </main>
    <button type="button" disabled={!canMutate} onClick={() => setEditor({})} aria-label="Új program hozzáadása" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-40 grid h-[54px] w-[54px] place-items-center rounded-full bg-coral text-deep-sea shadow-[0_12px_28px_rgba(217,99,57,.28)] transition-transform active:scale-95 disabled:opacity-50"><Icon name="plus" size={24} strokeWidth={2} /></button>
    {editor && <ActivityEditor key={editor.activity?.id ?? "new"} activity={editor.activity} onClose={() => setEditor(null)} onSave={save} onDelete={editor.activity ? () => remove(editor.activity!) : undefined} />}
    {toast && <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-5 right-[86px] z-50 flex min-h-11 items-center justify-between gap-3 rounded-ui-s bg-deep-sea px-3 py-2 text-[13px] font-medium text-white shadow-[0_6px_20px_rgba(24,50,59,.18)]" role="status"><span>{toast.message}</span>{toast.undo && <button type="button" onClick={() => void undo()} className="min-h-11 shrink-0 px-1 font-semibold text-turquoise">Visszavonás</button>}</div>}
  </>;
}
