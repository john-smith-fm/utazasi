"use client";

import type { TimelineActivityInput, TimelineActivityRecord, TimelineMutationResponse } from "@/lib/timeline-types";
import type { TimelineProposal } from "@/lib/timeline-proposal";

async function request(url: string, init: RequestInit): Promise<TimelineActivityRecord> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Offline módban a módosítás nem menthető.");
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({ error: "A művelet nem sikerült." })) as TimelineMutationResponse;
  if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : "A művelet nem sikerült.");
  return result.activity;
}

export function createTimelineActivity(tripSlug: string, date: string, activity: TimelineActivityInput, requestId?: string) {
  return request("/api/timeline", { method: "POST", body: JSON.stringify({ tripSlug, date, activity, requestId }) });
}

export function updateTimelineActivity(tripSlug: string, id: string, activity: TimelineActivityInput) {
  return request(`/api/timeline/${encodeURIComponent(id)}?trip=${encodeURIComponent(tripSlug)}`, { method: "PATCH", body: JSON.stringify({ activity }) });
}

export function deleteTimelineActivity(tripSlug: string, id: string) {
  return request(`/api/timeline/${encodeURIComponent(id)}?trip=${encodeURIComponent(tripSlug)}`, { method: "DELETE" });
}

async function proposalRequest<T>(url: string, body: unknown): Promise<T> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Offline módban a Timeline nem módosítható.");
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as ({ error?: unknown } & T) | null;
  if (!response.ok || !payload) throw new Error(typeof payload?.error === "string" ? payload.error : "A Timeline-művelet nem sikerült.");
  return payload;
}

export function applyTimelineProposalAtomically(tripSlug: string, proposal: TimelineProposal) {
  return proposalRequest<{ proposalId: string; activityIds: string[]; dayVersions: Record<string, number> }>("/api/timeline/proposals/apply", { tripSlug, proposal });
}

export function undoTimelineProposal(tripSlug: string, proposalId: string) {
  return proposalRequest<{ deletedCount: number; restoredCount: number }>("/api/timeline/proposals/undo", { tripSlug, proposalId });
}
