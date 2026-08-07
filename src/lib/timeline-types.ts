export type TimelineActivityKind = "plan" | "travel";

export type TimelineActivityRecord = {
  id: string;
  day_id: string;
  start_time: string;
  duration_minutes: number;
  title: string;
  description: string | null;
  location_name: string | null;
  place_slug: string | null;
  kind: TimelineActivityKind;
  is_system_generated: boolean;
  created_at: string;
  updated_at: string;
};

export type TimelineActivityInput = {
  title: string;
  startTime: string;
  durationMinutes: number;
  locationName: string;
  placeSlug: string | null;
  description: string;
};

export type TimelineMutationResponse =
  | { activity: TimelineActivityRecord }
  | { error: string };
