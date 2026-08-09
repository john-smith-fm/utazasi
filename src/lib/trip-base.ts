/**
 * Private, in-app reference to the family's accommodation. It deliberately
 * carries no address, coordinate or public Place detail.
 */
export const TRIP_BASE_SLUG = "trip-base" as const;
export const TRIP_BASE_NAME = "Ollastu Apartments" as const;

export function isTripBaseSlug(value: string | null | undefined) {
  return value === TRIP_BASE_SLUG;
}
