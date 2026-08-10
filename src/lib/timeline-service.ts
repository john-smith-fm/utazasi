import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TimelineActivityInput, TimelineActivityRecord } from "@/lib/timeline-types";
import { getPlaceBySlug } from "@/lib/places";
import { isTripBaseSlug } from "@/lib/trip-base";

export const TIMELINE_TRIP_SLUG = "sardinia-family-2026";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
type ServiceResult<T> = { data: T } | { error: string; status: number };

export function timelineServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Timeline data is not configured.");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** A research suggestion is watched only after the family accepts it into the Timeline. */
async function enableAcceptedEventWatch(eventId: string) {
  const supabase = timelineServerClient();
  const { data, error } = await supabase
    .from("event_watch_states")
    .select("event_id, baseline_status, baseline_starts_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.baseline_status || !data.baseline_starts_at) return;
  const { error: updateError } = await supabase.from("event_watch_states").update({ enabled: true }).eq("event_id", eventId);
  if (updateError) throw updateError;
}

/** Removing the last accepted occurrence stops the associated automatic Watch. */
async function disableEventWatchWithoutTimelineReference(eventId: string) {
  const supabase = timelineServerClient();
  const { data, error } = await supabase.from("timeline_activities").select("id").eq("source_event_id", eventId).limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) return;
  const { error: updateError } = await supabase.from("event_watch_states").update({ enabled: false }).eq("event_id", eventId);
  if (updateError) throw updateError;
}

function normalizeInput(value: unknown): ServiceResult<TimelineActivityInput> {
  if (!value || typeof value !== "object") return { error: "Érvénytelen programadat.", status: 400 };
  const input = value as Partial<TimelineActivityInput>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const startTime = typeof input.startTime === "string" ? input.startTime : "";
  const durationMinutes = Number(input.durationMinutes);
  const locationName = typeof input.locationName === "string" ? input.locationName.trim() : "";
  const placeSlug = input.placeSlug === null ? null : typeof input.placeSlug === "string" ? input.placeSlug.trim() : undefined;
  const description = typeof input.description === "string" ? input.description.trim() : "";

  if (!title || title.length > 120) return { error: "Adj meg legfeljebb 120 karakteres programnevet.", status: 400 };
  if (!TIME_PATTERN.test(startTime)) return { error: "Adj meg érvényes kezdési időt.", status: 400 };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return { error: "Az időtartam 1 és 1440 perc között lehet.", status: 400 };
  if (locationName.length > 160) return { error: "A hely neve legfeljebb 160 karakter lehet.", status: 400 };
  if (placeSlug === undefined) return { error: "Érvénytelen helyazonosító.", status: 400 };
  if (placeSlug && !isTripBaseSlug(placeSlug) && !getPlaceBySlug(placeSlug)) return { error: "A kiválasztott hely nem található.", status: 400 };
  if (description.length > 1000) return { error: "A megjegyzés legfeljebb 1000 karakter lehet.", status: 400 };

  return {
    data: {
      title,
      startTime,
      durationMinutes,
      locationName,
      placeSlug,
      description,
    },
  };
}

async function dayForDate(date: string): Promise<ServiceResult<{ id: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Érvénytelen nap.", status: 400 };
  const supabase = timelineServerClient();
  const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
  if (tripError) throw tripError;
  if (!trip) return { error: "Az utazás nem található.", status: 404 };

  const { data: day, error: dayError } = await supabase.from("days").select("id").eq("trip_id", trip.id).eq("date", date).maybeSingle();
  if (dayError) throw dayError;
  return day ? { data: day } : { error: "Ehhez a naphoz még nincs napi terv.", status: 404 };
}

function localDateTimeParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

async function editableActivity(id: string): Promise<ServiceResult<TimelineActivityRecord>> {
  if (!UUID_PATTERN.test(id)) return { error: "Érvénytelen programpont.", status: 400 };
  const supabase = timelineServerClient();
  const { data, error } = await supabase
    .from("timeline_activities")
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at, days!inner(trip_id, trips!inner(slug))")
    .eq("id", id)
    .eq("days.trips.slug", TIMELINE_TRIP_SLUG)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { error: "A programpont nem található.", status: 404 };
  if (data.kind !== "plan" || data.is_system_generated) return { error: "Ez a rendszer által kezelt programpont nem szerkeszthető.", status: 403 };

  const { days: _days, ...activity } = data;
  return { data: activity };
}

async function activityForTrip(id: string): Promise<ServiceResult<TimelineActivityRecord>> {
  if (!UUID_PATTERN.test(id)) return { error: "Érvénytelen programpont.", status: 400 };
  const supabase = timelineServerClient();
  const { data, error } = await supabase
    .from("timeline_activities")
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at, days!inner(trip_id, trips!inner(slug))")
    .eq("id", id)
    .eq("days.trips.slug", TIMELINE_TRIP_SLUG)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: "A programpont nem található.", status: 404 };
  const { days: _days, ...activity } = data;
  return { data: activity };
}

export async function createTimelineActivity(date: string, rawInput: unknown, rawRequestId?: unknown): Promise<ServiceResult<TimelineActivityRecord>> {
  const input = normalizeInput(rawInput);
  if ("error" in input) return input;
  const day = await dayForDate(date);
  if ("error" in day) return day;
  const requestId = rawRequestId === undefined ? undefined : typeof rawRequestId === "string" && UUID_PATTERN.test(rawRequestId) ? rawRequestId : null;
  if (requestId === null) return { error: "Érvénytelen mentési azonosító.", status: 400 };
  const supabase = timelineServerClient();
  const { data, error } = await supabase
    .from("timeline_activities")
    .insert({
      ...(requestId ? { id: requestId } : {}),
      day_id: day.data.id,
      start_time: input.data.startTime,
      start_time_precision: "exact",
      time_label: null,
      duration_minutes: input.data.durationMinutes,
      title: input.data.title,
      location_name: input.data.locationName || null,
      place_slug: input.data.placeSlug,
      description: input.data.description || null,
      kind: "plan",
      is_system_generated: false,
    })
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at")
    .single();
  if (error) {
    if (requestId && error.code === "23505") {
      const existing = await activityForTrip(requestId);
      if ("data" in existing && existing.data.day_id === day.data.id) return existing;
    }
    throw error;
  }
  return { data };
}

/** Accepts a verified, concrete daily Event into the family's editable plan.
 * Event series intentionally never reach this function. */
export async function acceptEventIntoTimeline(eventId: string, date: string): Promise<ServiceResult<TimelineActivityRecord>> {
  if (!UUID_PATTERN.test(eventId)) return { error: "Érvénytelen esemény.", status: 400 };
  const day = await dayForDate(date);
  if ("error" in day) return day;

  const supabase = timelineServerClient();
  const { data: ownedEvent, error: ownedEventError } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, status, place_slug, source_url, trip_id")
    .eq("id", eventId)
    .maybeSingle();
  if (ownedEventError) throw ownedEventError;
  if (!ownedEvent) return { error: "Az esemény nem található.", status: 404 };
  const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("slug", TIMELINE_TRIP_SLUG).maybeSingle();
  if (tripError) throw tripError;
  if (!trip || ownedEvent.trip_id !== trip.id) return { error: "Az esemény nem ehhez az utazáshoz tartozik.", status: 403 };
  if (ownedEvent.status === "cancelled") return { error: "Törölt esemény nem adható a napi tervhez.", status: 409 };
  if (!ownedEvent.ends_at) return { error: "Az esemény végideje még nincs ellenőrzött adatként rögzítve.", status: 409 };

  const start = localDateTimeParts(ownedEvent.starts_at);
  const end = localDateTimeParts(ownedEvent.ends_at);
  if (start.date !== date || end.date !== date) return { error: "Csak konkrét, egy napra eső esemény adható a napi tervhez.", status: 409 };
  const durationMinutes = Math.round((new Date(ownedEvent.ends_at).getTime() - new Date(ownedEvent.starts_at).getTime()) / 60000);
  if (durationMinutes < 1 || durationMinutes > 1440) return { error: "Az esemény időtartama nem használható a napi tervben.", status: 409 };

  const { data: existing, error: existingError } = await supabase
    .from("timeline_activities")
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at")
    .eq("day_id", day.data.id)
    .eq("source_event_id", ownedEvent.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    await enableAcceptedEventWatch(ownedEvent.id);
    return { data: existing };
  }

  const place = ownedEvent.place_slug ? getPlaceBySlug(ownedEvent.place_slug) : undefined;
  const { data, error } = await supabase
    .from("timeline_activities")
    .insert({
      day_id: day.data.id,
      start_time: start.time,
      start_time_precision: "exact",
      time_label: null,
      duration_minutes: durationMinutes,
      title: ownedEvent.title,
      location_name: place?.name ?? null,
      place_slug: ownedEvent.place_slug,
      description: null,
      source_event_id: ownedEvent.id,
      kind: "plan",
      is_system_generated: false,
    })
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at")
    .single();
  if (error) throw error;
  await enableAcceptedEventWatch(ownedEvent.id);
  return { data };
}

export async function updateTimelineActivity(id: string, rawInput: unknown): Promise<ServiceResult<TimelineActivityRecord>> {
  const input = normalizeInput(rawInput);
  if ("error" in input) return input;
  const current = await editableActivity(id);
  if ("error" in current) return current;
  const supabase = timelineServerClient();
  const { data, error } = await supabase
    .from("timeline_activities")
    .update({
      start_time: input.data.startTime,
      start_time_precision: "exact",
      time_label: null,
      duration_minutes: input.data.durationMinutes,
      title: input.data.title,
      location_name: input.data.locationName || null,
      place_slug: input.data.placeSlug,
      description: input.data.description || null,
    })
    .eq("id", current.data.id)
    .select("id, day_id, start_time, start_time_precision, time_label, duration_minutes, title, description, location_name, place_slug, source_event_id, kind, is_system_generated, created_at, updated_at")
    .single();
  if (error) throw error;
  return { data };
}

export async function deleteTimelineActivity(id: string): Promise<ServiceResult<TimelineActivityRecord>> {
  const current = await editableActivity(id);
  if ("error" in current) return current;
  const supabase = timelineServerClient();
  const { error } = await supabase.from("timeline_activities").delete().eq("id", current.data.id);
  if (error) throw error;
  if (current.data.source_event_id) await disableEventWatchWithoutTimelineReference(current.data.source_event_id);
  return { data: current.data };
}
