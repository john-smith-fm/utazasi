export type TimelineActivityKind = "plan" | "travel";
export type TimelineTimePrecision = "exact" | "approximate" | "period";
export type TimelinePeriod = "Reggel" | "Délelőtt" | "Délután" | "Este";

export type TimelineActivityRecord = {
  id: string;
  day_id: string;
  start_time: string;
  start_time_precision: TimelineTimePrecision;
  time_label: TimelinePeriod | null;
  duration_minutes: number;
  title: string;
  description: string | null;
  location_name: string | null;
  place_slug: string | null;
  source_event_id: string | null;
  kind: TimelineActivityKind;
  is_system_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type TimelineActivityInput = {
  title: string;
  startTime: string;
  startTimePrecision: TimelineTimePrecision;
  timeLabel: TimelinePeriod | null;
  durationMinutes: number;
  locationName: string;
  placeSlug: string | null;
  description: string;
};

export type TimelineMutationResponse =
  | { activity: TimelineActivityRecord }
  | { error: string };
