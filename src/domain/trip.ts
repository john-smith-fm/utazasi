export const TRIP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type TripStatus = "draft" | "upcoming" | "active" | "past" | "archived";

export type TripRef = {
  id: string;
  slug: string;
};

export type Trip = TripRef & {
  name: string;
  destinationLabel: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  status: TripStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TripDaySummary = {
  id: string;
  date: string;
  title: string;
  subtitle: string | null;
};

export type TripSummary = Trip & {
  days: TripDaySummary[];
};

export function normalizeTripSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return slug.length <= 80 && TRIP_SLUG_PATTERN.test(slug) ? slug : null;
}
