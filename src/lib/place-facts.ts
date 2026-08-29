import type { BeachDetails, Place, PlaceAccess } from "../types/places";

const SHORE_TYPE_LABELS: Record<NonNullable<BeachDetails["shoreType"]>, string> = {
  sandy: "Homokos",
  pebbly: "Kavicsos",
  rocky: "Sziklás",
};

const LAND_ACCESS_LABELS: Record<NonNullable<BeachDetails["landAccess"]>, string> = {
  easy: "Könnyű megközelítés",
  moderate: "Közepes megközelítés",
  hard: "Nehéz megközelítés",
  no_access: "Nincs szárazföldi hozzáférés",
};

function beachDetails(place: Place): BeachDetails | undefined {
  return place.details.kind === "beach" ? place.details : undefined;
}

export function formatShoreType(value: BeachDetails["shoreType"]) {
  return value ? SHORE_TYPE_LABELS[value] : undefined;
}

export function formatBeachLength(lengthM: BeachDetails["lengthM"]) {
  if (typeof lengthM !== "number" || !Number.isFinite(lengthM) || lengthM <= 0) return undefined;
  if (lengthM < 1_000) return `${Math.round(lengthM)} m`;
  return `${(lengthM / 1_000).toLocaleString("hu-HU", { maximumFractionDigits: 2 })} km`;
}

/** Some verified sources publish only a qualified length (for example
 * "about 2 km"). Keep the qualification instead of inventing a precise size. */
export function formatBeachLengthLabel(lengthLabel: BeachDetails["lengthLabel"]) {
  if (!lengthLabel) return undefined;
  return lengthLabel.replace(/^about\s+/i, "Kb. ");
}

export function formatLandAccess(value: BeachDetails["landAccess"]) {
  return value ? LAND_ACCESS_LABELS[value] : undefined;
}

/** Small, reusable facts row for beach browsing. It deliberately omits
 * unknown values rather than turning an absent canonical field into copy. */
export function getBeachCardFacts(place: Place) {
  const details = beachDetails(place);
  if (!details) return [];
  return [
    formatShoreType(details.shoreType),
    formatBeachLength(details.lengthM) ?? formatBeachLengthLabel(details.lengthLabel),
    formatLandAccess(details.landAccess),
  ].filter((fact): fact is string => Boolean(fact));
}

export function getBeachPartFacts(place: Place) {
  const details = beachDetails(place);
  if (!details) return [];
  return [
    formatShoreType(details.shoreType),
    details.shoreDescription,
    formatBeachLength(details.lengthM) ?? formatBeachLengthLabel(details.lengthLabel),
    details.waterEntry,
    details.shallowWater === true ? "Sekély víz" : undefined,
    details.windExposure,
  ].filter((fact): fact is string => Boolean(fact));
}

function getAccessFacts(access: PlaceAccess | undefined) {
  return [
    access?.characteristics?.join(" · "),
    access?.serpentineRoad ? "Szerpentines megközelítés" : undefined,
    access?.dirtRoad ? "Földutas megközelítés" : undefined,
    access?.mainRoad ? "Főúti megközelítés" : undefined,
    access?.coastalRoad ? "Part menti útvonal" : undefined,
    access?.steps ? "Lépcsős megközelítés" : undefined,
    access?.stroller === "possible" ? "Babakocsival használható" : undefined,
    access?.stroller === "limited" ? "Babakocsival korlátozott" : undefined,
    access?.accessible ? "Akadálymentes megközelítés" : undefined,
    access?.roadNotes,
    access?.notes,
  ].filter((fact): fact is string => Boolean(fact));
}

export function getBeachAccessFacts(place: Place) {
  const details = beachDetails(place);
  if (!details) return [];
  return [formatLandAccess(details.landAccess), ...getAccessFacts(details.access)];
}

export function getGenericAccessFacts(place: Place) {
  if (place.details.kind === "beach" || place.details.kind === "restaurant" || place.details.kind === "shop") return [];
  return getAccessFacts(place.details.access);
}

/** Family facts originate only from an explicit canonical family field. */
export function getPlaceFamilyFacts(place: Place) {
  if (place.details.kind === "beach") return place.details.familyFacts ?? [];
  if (place.details.kind === "restaurant" || place.details.kind === "shop") return [];
  return place.details.familyFacts ?? [];
}

export function getBeachParkingFacts(place: Place) {
  const details = beachDetails(place);
  if (!details?.parking) return [];
  const parking = details.parking;
  return [
    parking.available === true ? "Parkoló elérhető" : undefined,
    parking.paid === true ? "Fizetős" : parking.paid === false ? "Ingyenes" : undefined,
    parking.seasonal === true ? "Szezonális" : undefined,
    typeof parking.walkDistanceM === "number" ? `${Math.round(parking.walkDistanceM)} m gyalog` : undefined,
    parking.price,
    parking.notes,
  ].filter((fact): fact is string => Boolean(fact));
}

/** Short, fact-only summary for restaurant list rows. */
export function getRestaurantCardFacts(place: Place) {
  if (place.details.kind !== "restaurant") return [];
  return [
    ...(place.details.mealProfiles ?? []).slice(0, 2),
    ...(place.details.cuisine ?? []).slice(0, 1),
  ];
}

/** A shop's confirmed departments are safe, compact list facts. */
export function getShopCardFacts(place: Place) {
  if (place.details.kind !== "shop") return [];
  const departments = place.details.shop?.confirmedDepartments ?? [];
  return departments.length ? departments.slice(0, 3) : (place.details.shop?.health?.profiles ?? []).slice(0, 3);
}

/** Dedicated parking records retain their confirmed tariff context without
 * claiming a price when the canonical source omitted one. */
export function getParkingCardFacts(place: Place) {
  if (place.details.kind !== "parking") return [];
  const parking = place.details.parking;
  if (!parking) return [];
  return [
    parking.paid === true ? "Fizetős" : undefined,
    parking.chargingWindow,
  ].filter((fact): fact is string => Boolean(fact));
}

const MARKET_WEEKDAY_LABELS: Record<string, string> = {
  Monday: "Hétfő",
  Tuesday: "Kedd",
  Wednesday: "Szerda",
  Thursday: "Csütörtök",
  Friday: "Péntek",
  Saturday: "Szombat",
  Sunday: "Vasárnap",
};

/** Localize only an unambiguous weekday and time-range presentation; the
 * canonical market schedule itself stays untouched in the Place model. */
export function formatMarketSchedule(schedule?: string) {
  if (!schedule) return undefined;
  return schedule
    .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/, (weekday) => MARKET_WEEKDAY_LABELS[weekday] ?? weekday)
    .replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, "$1–$2");
}

/** Other place categories expose only their explicitly confirmed services. */
export function getGenericPlaceCardFacts(place: Place) {
  if (place.details.kind === "beach" || place.details.kind === "restaurant" || place.details.kind === "shop") return [];
  const parkingFacts = getParkingCardFacts(place);
  if (parkingFacts.length) return parkingFacts;
  const foodFacts = [
    ...(place.details.food?.mealProfiles ?? []).slice(0, 2),
    ...(place.details.food?.cuisine ?? []).slice(0, 1),
  ];
  if (foodFacts.length) return foodFacts;
  const marketFacts = [
    formatMarketSchedule(place.details.market?.schedule),
    ...(place.details.market?.profiles ?? []),
  ].filter((fact): fact is string => Boolean(fact));
  return marketFacts.length ? marketFacts.slice(0, 3) : (place.details.confirmedServices ?? []).slice(0, 3);
}
