export type MobilityMode = "driving" | "walking";

/** A canonical route is directional. We never infer a return journey from it. */
export type RouteEstimate = {
  fromSlug: string;
  toSlug: string;
  mode: MobilityMode;
  distanceKm: number;
  durationMinutes: number;
  sourceUrl: string;
  checkedAt: string;
};
