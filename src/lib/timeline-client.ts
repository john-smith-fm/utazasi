"use client";

import type { TimelineActivityInput, TimelineActivityRecord, TimelineMutationResponse } from "@/lib/timeline-types";

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

export function createTimelineActivity(date: string, activity: TimelineActivityInput, requestId?: string) {
  return request("/api/timeline", { method: "POST", body: JSON.stringify({ date, activity, requestId }) });
}

export function updateTimelineActivity(id: string, activity: TimelineActivityInput) {
  return request(`/api/timeline/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ activity }) });
}

export function deleteTimelineActivity(id: string) {
  return request(`/api/timeline/${encodeURIComponent(id)}`, { method: "DELETE" });
}
