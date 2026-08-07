"use client";

import { useRef, useState } from "react";
import type { HomeActivity } from "@/data/home-days";
import type { TimelineActivityInput } from "@/lib/timeline-types";

type ActionState = "idle" | "saving" | "deleting";

function initialInput(activity?: HomeActivity): TimelineActivityInput {
  return {
    title: activity?.title ?? "",
    startTime: activity?.time || "09:00",
    durationMinutes: activity?.durationMinutes ?? 60,
    locationName: activity?.place ?? "",
    description: activity?.description ?? "",
  };
}

export function ActivityEditor({ activity, onClose, onSave, onDelete }: {
  activity?: HomeActivity;
  onClose: () => void;
  onSave: (input: TimelineActivityInput, requestId?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [input, setInput] = useState(() => initialInput(activity));
  const [action, setAction] = useState<ActionState>("idle");
  const [error, setError] = useState("");
  const editing = Boolean(activity?.id);
  const createRequestId = useRef<string | null>(null);

  function update<Key extends keyof TimelineActivityInput>(key: Key, value: TimelineActivityInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action !== "idle") return;
    setAction("saving");
    try {
      if (!editing && !createRequestId.current) createRequestId.current = crypto.randomUUID();
      await onSave(input, createRequestId.current ?? undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A mentés nem sikerült.");
      setAction("idle");
    }
  }

  async function remove() {
    if (!onDelete || action !== "idle") return;
    setAction("deleting");
    try {
      await onDelete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A törlés nem sikerült.");
      setAction("idle");
    }
  }

  return <section role="dialog" aria-modal="true" aria-label={editing ? "Program szerkesztése" : "Új program"} className="fixed inset-0 z-[70] overflow-y-auto bg-quartz text-deep-sea">
    <form onSubmit={(event) => void submit(event)} className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="flex min-h-14 items-center justify-between">
        <button type="button" onClick={onClose} disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-s px-2 text-left text-[15px] font-semibold disabled:opacity-45">Vissza</button>
        <h1 className="text-xl font-bold tracking-[-.02em]">{editing ? "Program" : "Új program"}</h1>
        <button type="submit" disabled={action !== "idle"} className="min-h-11 min-w-11 rounded-s px-2 text-right text-[15px] font-semibold text-turquoise-dark disabled:opacity-45">{action === "saving" ? "…" : "Mentés"}</button>
      </header>
      <div className="mt-8 space-y-5">
        <Field label="Program"><input autoFocus required maxLength={120} value={input.title} onChange={(event) => update("title", event.target.value)} className="h-12 w-full rounded-s border border-deep-sea/10 bg-white px-4 text-[16px] outline-none focus:border-turquoise-dark" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kezdés"><input required type="time" value={input.startTime} onChange={(event) => update("startTime", event.target.value)} className="h-12 w-full rounded-s border border-deep-sea/10 bg-white px-3 text-[16px] outline-none focus:border-turquoise-dark" /></Field>
          <Field label="Időtartam (perc)"><input required type="number" min="1" max="1440" inputMode="numeric" value={input.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value))} className="h-12 w-full rounded-s border border-deep-sea/10 bg-white px-3 text-[16px] outline-none focus:border-turquoise-dark" /></Field>
        </div>
        <Field label="Hely"><input maxLength={160} value={input.locationName} onChange={(event) => update("locationName", event.target.value)} className="h-12 w-full rounded-s border border-deep-sea/10 bg-white px-4 text-[16px] outline-none focus:border-turquoise-dark" /></Field>
        <Field label="Megjegyzés"><textarea maxLength={1000} value={input.description} onChange={(event) => update("description", event.target.value)} className="min-h-28 w-full resize-y rounded-s border border-deep-sea/10 bg-white px-4 py-3 text-[16px] leading-[21px] outline-none focus:border-turquoise-dark" /></Field>
      </div>
      {error && <p className="mt-5 text-sm leading-[21px] text-error" role="alert">{error}</p>}
      {editing && <div className="mt-auto pt-10"><button type="button" onClick={() => void remove()} disabled={action !== "idle"} className="min-h-11 w-full rounded-s border border-error/30 bg-error/10 px-4 text-[15px] font-semibold text-error disabled:opacity-45">{action === "deleting" ? "…" : "Program törlése"}</button></div>}
    </form>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[13px] font-semibold text-deep-sea/55">{label}</span>{children}</label>;
}
