"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useActiveTrip } from "@/components/TripProvider";
import { type HomeActivity } from "@/data/home-days";
import { TRIP_CORE } from "@/data/trip-core";
import type { TripSummary } from "@/domain/trip";
import { useTimelineDay, useTripTimeline } from "@/hooks/useTimelineDay";
import { useLiveData } from "@/hooks/useLiveData";
import { useCurrentLocationContext } from "@/hooks/useCurrentLocationContext";
import { useTripEvents } from "@/hooks/useTripEvents";
import { applyTimelineProposalAtomically, createTimelineActivity, deleteTimelineActivity, undoTimelineProposal, updateTimelineActivity } from "@/lib/timeline-client";
import type { TimelineActivityInput, TimelineActivityRecord } from "@/lib/timeline-types";
import { initialTripDate } from "@/lib/initial-trip-date";
import { dayDisplayContext } from "@/lib/day-display-context";
import { buildEditorialCopyInput } from "@/lib/editorial-copy-context";
import { useEditorialCopy } from "@/hooks/useEditorialCopy";
import { tripDayShells } from "@/lib/trip-days";
import type { TimelineProposal } from "@/lib/timeline-proposal";

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
  const { activeTrip, trips, status, selectTrip, retry } = useActiveTrip();
  if (!activeTrip) {
    return <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center px-6 text-center">
      <p className="text-[12px] font-bold uppercase tracking-[.16em] text-turquoise">Utazási</p>
      <h1 className="mt-3 text-2xl font-bold tracking-[-.035em]">{status === "loading" ? "Utazások betöltése…" : "Nincs megnyitható utazás"}</h1>
      {status !== "loading" ? <button type="button" onClick={retry} className="mt-5 min-h-11 rounded-full bg-deep-sea px-5 text-sm font-semibold text-white">Újrapróbálom</button> : null}
    </main>;
  }
  return <ActiveTripHome key={activeTrip.slug} trip={activeTrip} trips={trips} onSelectTrip={selectTrip} />;
}

function ActiveTripHome({ trip, trips, onSelectTrip }: { trip: TripSummary; trips: TripSummary[]; onSelectTrip: (slug: string) => void }) {
  const { scheduleUndo } = useUndoToast();
  const days = useMemo(() => tripDayShells(trip), [trip]);
  const startDate = trip.startDate ?? days[0]?.date ?? "1970-01-01";
  const endDate = trip.endDate ?? days.at(-1)?.date ?? startDate;
  const tripRuntime = useMemo(() => ({ startDate, endDate, timezone: trip.timezone }), [endDate, startDate, trip.timezone]);
  // Initial selection only. Later clicks own this same state and must never
  // be pulled back to today's date during the session.
  const [selectedDate, setSelectedDate] = useState(() => initialTripDate(tripRuntime));
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingEditorId, setPendingEditorId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const feedbackTimer = useRef<number | null>(null);
  // The API-provided Trip days are safe shells only. Runtime activities still
  // come exclusively from the selected Trip's Timeline endpoint or its cache.
  const fallbackDay = days.find((item) => item.date === selectedDate) ?? days[0] ?? { date: startDate, day: Number(startDate.slice(-2)), weekday: "Hét" as const, title: "Új nap", summary: "", activities: [] };
  const { day, status, hasRemoteDay, canWrite, retry } = useTimelineDay(trip.slug, selectedDate, fallbackDay);
  const tripTimeline = useTripTimeline(trip.slug, days);
  const currentLocation = useCurrentLocationContext();
  const hasLegacyDestinationData = trip.slug === TRIP_CORE.slug;
  const { weather, sea } = useLiveData(currentLocation.context, undefined, hasLegacyDestinationData);
  const events = useTripEvents(trip.slug, selectedDate);
  const canMutate = canWrite;
  const displayContext = useMemo(() => dayDisplayContext(day, tripRuntime, tripTimeline.days), [day, tripRuntime, tripTimeline.days]);
  const editorialInput = useMemo(() => buildEditorialCopyInput(day, tripRuntime, tripTimeline.days), [day, tripRuntime, tripTimeline.days]);
  const editorialFallback = useMemo(() => ({ title: displayContext.title, subtitle: displayContext.summary }), [displayContext]);
  const editorialCopy = useEditorialCopy(editorialInput, editorialFallback);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get("day");
    if (requestedDate && days.some((item) => item.date === requestedDate)) {
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
    if (editor?.activity?.id) await updateTimelineActivity(trip.slug, editor.activity.id, input);
    else await createTimelineActivity(trip.slug, selectedDate, input, requestId);
    setEditor(null);
    retry();
    tripTimeline.retry();
    showToast("Program mentve");
  }

  async function remove(activity: HomeActivity) {
    if (!activity.id) return;
    const deleted = await deleteTimelineActivity(trip.slug, activity.id);
    setEditor(null);
    retry();
    tripTimeline.retry();
    const deletedActivity = toHomeActivity(deleted);
    const deletedDate = selectedDate;
    scheduleUndo({ message: "Program törölve.", onUndo: async () => {
      await createTimelineActivity(trip.slug, deletedDate, toInput(deletedActivity), deletedActivity.id);
      retry();
      tripTimeline.retry();
      showToast("Program visszaállítva");
    }, onError: (caught) => showToast(caught instanceof Error ? caught.message : "A visszaállítás nem sikerült.") });
  }

  async function changeStartTime(activity: HomeActivity, startTime: string) {
    if (!activity.id) return;
    await updateTimelineActivity(trip.slug, activity.id, { ...toInput(activity), startTime });
    retry();
    tripTimeline.retry();
    showToast("Időpont módosítva");
  }

  async function applyTimelineProposal(proposal: TimelineProposal) {
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("A Timeline módosításához hálózati kapcsolat szükséges.");
    const applied = await applyTimelineProposalAtomically(trip.slug, proposal);
    if (proposal.days[0]) setSelectedDate(proposal.days[0].date);
    retry();
    tripTimeline.retry();
    scheduleUndo({
      message: `${proposal.days.length} nap AI-javaslata alkalmazva.`,
      onUndo: async () => {
        await undoTimelineProposal(trip.slug, applied.proposalId);
        retry();
        tripTimeline.retry();
        showToast("AI-javaslat visszavonva");
      },
      onError: (caught) => showToast(caught instanceof Error ? caught.message : "A visszavonás nem sikerült."),
    });
  }

  return <>
    <Hero trip={trip} trips={trips} onSelectTrip={onSelectTrip} />
    <main className="relative z-10 mx-auto -mt-7 max-w-[430px]">
      <div className="px-5"><StatRow tripSlug={trip.slug} hasLegacyKnowledge={hasLegacyDestinationData} hasPrivateTripBase={hasLegacyDestinationData} weather={weather} sea={sea} day={day} events={events} tripDays={tripTimeline.days} tripStatus={tripTimeline.status} onOpenDay={setSelectedDate} onApplyTimelineProposal={applyTimelineProposal} /></div>
      {hasLegacyDestinationData ? <SunCard weather={weather} locationLabel={currentLocation.context.label} deviceState={currentLocation.deviceState} onRequestDeviceLocation={currentLocation.requestDeviceLocation} /> : <p className="mx-5 border-b border-deep-sea/10 py-3 text-center text-[11px] font-medium text-deep-sea/50">Az élő hely- és időjárásadatok ehhez a POC úthoz még nincsenek bekötve.</p>}
      <div className="px-5">
        {hasLegacyDestinationData ? <NotificationPreference /> : null}
        <TimelineCard day={day} days={days} context={{ ...displayContext, title: editorialCopy.title, summary: editorialCopy.subtitle }} onSelect={setSelectedDate} />
        <EventSuggestions tripSlug={trip.slug} date={selectedDate} events={events} onAccepted={() => { retry(); tripTimeline.retry(); showToast("Esemény hozzáadva a napi tervhez"); }} />
        <section className="mt-8"><PlanList activities={day.activities} status={status} hasCachedDay={hasRemoteDay} canEdit={canMutate} onRetry={retry} onSelect={(activity) => setEditor({ activity })} onDelete={(activity) => { void remove(activity).catch((caught) => showToast(caught instanceof Error ? caught.message : "A törlés nem sikerült.")); }} onTimeChange={changeStartTime} onError={showToast} /></section>
        <div aria-hidden="true" className="h-12" />
      </div>
    </main>
    <button type="button" disabled={!canMutate} onClick={() => setEditor({})} aria-label="Új program hozzáadása" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-40 grid h-[54px] w-[54px] place-items-center rounded-full bg-turquoise text-white transition-transform active:scale-95 disabled:opacity-50"><Icon name="plus" size={24} strokeWidth={2} /></button>
    {editor && <ActivityEditor key={editor.activity?.id ?? editor.draftId ?? "new"} activity={editor.activity} draft={editor.draft} draftId={editor.draftId} returnBaseHref={`/?day=${selectedDate}`} onClose={() => setEditor(null)} onSave={save} onDelete={editor.activity ? () => remove(editor.activity!) : undefined} />}
    {toast && <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-5 right-[86px] z-50 flex min-h-11 items-center justify-between gap-3 rounded-full bg-deep-sea px-3 py-2 text-[13px] font-medium text-white shadow-[0_6px_20px_rgba(24,50,59,.18)]" role="status"><span>{toast.message}</span></div>}
  </>;
}
