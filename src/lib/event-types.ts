export type TripEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: "scheduled" | "changed" | "cancelled";
  placeSlug: string | null;
  sourceUrl: string;
  lastVerifiedAt: string | null;
  /** True when this concrete Event already has a Timeline item on this day. */
  accepted?: boolean;
};
