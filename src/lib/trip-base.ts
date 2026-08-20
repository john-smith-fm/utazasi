/**
 * Private, in-app reference to the family's accommodation. It deliberately
 * carries no address, coordinate or public Place detail.
 */
export const TRIP_BASE_SLUG = "trip-base" as const;
export const TRIP_BASE_NAME = "Ollastu Apartments" as const;

export type PrivateTripBaseDetails = {
  name: typeof TRIP_BASE_NAME;
  address: string;
  mapUrl: string;
};

/** Builds the private, PIN-gated accommodation payload. The source address is
 * intentionally supplied at runtime and is never a public Place field. */
export function privateTripBaseDetails(origin?: string): PrivateTripBaseDetails | null {
  const address = origin?.trim();
  if (!address) return null;
  return {
    name: TRIP_BASE_NAME,
    address,
    mapUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`,
  };
}

export function isTripBaseSlug(value: string | null | undefined) {
  return value === TRIP_BASE_SLUG;
}
