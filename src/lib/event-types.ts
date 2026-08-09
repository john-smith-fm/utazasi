export type TripEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: "scheduled" | "changed" | "cancelled";
  placeSlug: string | null;
  sourceUrl: string;
  lastVerifiedAt: string | null;
};
