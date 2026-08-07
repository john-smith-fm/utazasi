"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityEditor } from "@/components/ActivityEditor";
import { Hero } from "@/components/Hero";
import { Icon } from "@/components/Icon";
import { PlanList } from "@/components/PlanList";
import { StatRow } from "@/components/StatRow";
import { SunCard } from "@/components/SunCard";
import { TimelineCard } from "@/components/TimelineCard";
import { HOME_DAYS, type HomeActivity } from "@/data/home-days";
import { useTimelineDay } from "@/hooks/useTimelineDay";
import { createTimelineActivity, deleteTimelineActivity, updateTimelineActivity } from "@/lib/timeline-client";
import type { TimelineActivityInput } from "@/lib/timeline-types";

type EditorState = { activity?: HomeActivity } | null;
type ToastState = { message: string; undo?: boolean } | null;
type UndoRecord = { activity: HomeActivity; date: string };

function toInput(activity: HomeActivity): TimelineActivityInput {
  return {
    title: activity.title,
    startTime: activity.time,
    durationMinutes: activity.durationMinutes ?? 60,
    locationName: activity.place,
    description: activity.description ?? "",
  };
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(HOME_DAYS[1].date);
  const [editor, setEditor] = useState<EditorState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const undoActivity = useRef<UndoRecord | null>(null);
  const undoTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const fallbackDay = HOME_DAYS.find((item) => item.date === selectedDate) ?? HOME_DAYS[0];
  const { day, status, retry } = useTimelineDay(selectedDate, fallbackDay);
  const canMutate = status === "success";

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
    if (!canMutate) throw new Error(status === "offline" ? "Offline módban nem lehet menteni." : "A napi terv még nem szerkeszthető.");
    if (editor?.activity?.id) await updateTimelineActivity(editor.activity.id, input);
    else await createTimelineActivity(selectedDate, input, requestId);
    setEditor(null);
    retry();
    showToast("Program mentve");
  }

  async function remove(activity: HomeActivity) {
    if (!activity.id) return;
    if (!canMutate) throw new Error(status === "offline" ? "Offline módban nem lehet törölni." : "A napi terv még nem szerkeszthető.");
    await deleteTimelineActivity(activity.id);
    setEditor(null);
    retry();
    startUndo(activity);
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
      showToast("Esemény visszaállítva");
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "A visszaállítás nem sikerült.");
    }
  }

  return <>
    <Hero />
    <main className="relative z-10 mx-auto -mt-7 max-w-[430px] pb-[126px]">
      <div className="px-5"><StatRow /></div>
      <SunCard />
      <div className="px-5">
        <TimelineCard day={day} onSelect={setSelectedDate} />
        <section className="mt-8"><PlanList activities={day.activities} status={status} onRetry={retry} onSelect={(activity) => setEditor({ activity })} onDelete={(activity) => { void remove(activity).catch((caught) => showToast(caught instanceof Error ? caught.message : "A törlés nem sikerült.")); }} /></section>
      </div>
    </main>
    <button type="button" disabled={!canMutate} onClick={() => setEditor({})} aria-label="Új program hozzáadása" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-5 z-40 grid h-[54px] w-[54px] place-items-center rounded-full bg-coral text-deep-sea shadow-[0_12px_28px_rgba(217,99,57,.28)] transition-transform active:scale-95 disabled:opacity-50"><Icon name="plus" size={24} strokeWidth={2} /></button>
    {editor && <ActivityEditor key={editor.activity?.id ?? "new"} activity={editor.activity} onClose={() => setEditor(null)} onSave={save} onDelete={editor.activity ? () => remove(editor.activity!) : undefined} />}
    {toast && <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-5 right-[86px] z-50 flex min-h-11 items-center justify-between gap-3 rounded-s bg-deep-sea px-3 py-2 text-[13px] font-medium text-white shadow-[0_6px_20px_rgba(24,50,59,.18)]" role="status"><span>{toast.message}</span>{toast.undo && <button type="button" onClick={() => void undo()} className="min-h-11 shrink-0 px-1 font-semibold text-turquoise">Visszavonás</button>}</div>}
  </>;
}
