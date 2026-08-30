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
import { useUndoToast } from "@/components/UndoProvider";
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

type EditorState = { activity?: HomeActivity; draft?: TimelineActivityInput; draftId?: string } | null;
type ToastState = { message: string } | null;

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

function draftFromSession(id: string): TimelineActivityInput | null {
  try {
    const key = `utazasi:timeline-editor-draft:${id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<TimelineActivityInput>;
    if (typeof value.title !== "string" || typeof value.startTime !== "string" || typeof value.durationMinutes !== "number" || typeof value.locationName !== "string" || typeof value.description !== "string") return null;
    if (value.placeSlug !== null && typeof value.placeSlug !== "string") return null;
    const draft = { title: value.title, startTime: value.startTime, durationMinutes: value.durationMinutes, locationName: value.locationName, placeSlug: value.placeSlug, description: value.description };
    sessionStorage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const { scheduleUndo } = useUndoToast();
  const [selectedDate, setSelectedDate] = useState(TRIP_CORE_DAYS[1].date);
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingEditorId, setPendingEditorId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
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
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get("day");
    if (requestedDate && TRIP_CORE_DAYS.some((item) => item.date === requestedDate)) {
      setSelectedDate(requestedDate);
    }
    const requestedEditorId = params.get("edit");
    if (requestedEditorId) setPendingEditorId(requestedEditorId);
    const requestedDraftId = params.get("draft");
    if (requestedDraftId && !requestedEditorId) {
      const draft = draftFromSession(requestedDraftId);
      if (draft) setEditor({ draft, draftId: requestedDraftId });
      params.delete("draft");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
  }, []);

  useEffect(() => {
    if (!pendingEditorId || !hasRemoteDay) return;
    const activity = day.activities.find((item) => item.id === pendingEditorId);
    if (!activity) return;
    setEditor({ activity });
    setPendingEditorId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [day.activities, hasRemoteDay, pendingEditorId]);

  useEffect(() => () => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  function showToast(message: string) {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setToast({ message });
    feedbackTimer.current = window.setTimeout(() => {
      setToast(null);
      feedbackTimer.current = null;
    }, 3500);
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
    const deletedActivity = toHomeActivity(deleted);
    const deletedDate = selectedDate;
    scheduleUndo({ message: "Program törölve.", onUndo: async () => {
      await createTimelineActivity(deletedDate, toInput(deletedActivity), deletedActivity.id);
      retry();
      tripTimeline.retry();
      showToast("Program visszaállítva");
    }, onError: (caught) => showToast(caught instanceof Error ? caught.message : "A visszaállítás nem sikerült.") });
  }

  async function changeStartTime(activity: HomeActivity, startTime: string) {
    if (!activity.id) return;
    await updateTimelineActivity(activity.id, { ...toInput(activity), startTime });
    retry();
    tripTimeline.retry();
    showToast("Időpont módosítva");
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
    <button type="button" disabled={!canMutate} onClick={() => setEditor({})} aria-label="Új program hozzáadása" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-40 grid h-[54px] w-[54px] place-items-center rounded-full bg-turquoise text-white transition-transform active:scale-95 disabled:opacity-50"><Icon name="plus" size={24} strokeWidth={2} /></button>
    {editor && <ActivityEditor key={editor.activity?.id ?? editor.draftId ?? "new"} activity={editor.activity} draft={editor.draft} draftId={editor.draftId} returnBaseHref={`/?day=${selectedDate}`} onClose={() => setEditor(null)} onSave={save} onDelete={editor.activity ? () => remove(editor.activity!) : undefined} />}
    {toast && <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-5 right-[86px] z-50 flex min-h-11 items-center justify-between gap-3 rounded-full bg-deep-sea px-3 py-2 text-[13px] font-medium text-white shadow-[0_6px_20px_rgba(24,50,59,.18)]" role="status"><span>{toast.message}</span></div>}
  </>;
}
