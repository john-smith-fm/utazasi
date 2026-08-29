import beachesJson from "../../knowledge/places/beaches.json";
import restaurantsJson from "../../knowledge/places/restaurants.json";
import sightsJson from "../../knowledge/places/sights.json";
import playgroundsJson from "../../knowledge/places/playgrounds.json";
import cafesJson from "../../knowledge/places/cafes.json";
import shopsJson from "../../knowledge/places/shops.json";
import otherJson from "../../knowledge/places/other.json";
import parkingJson from "../../knowledge/places/parking.json";
import slugAliasesJson from "../../knowledge/places/slug-aliases.json";
import type { BeachAccess, BeachDetails, BeachPlace, Place, PlaceAccess, PlaceType, RestaurantPlace } from "@/types/places";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Érvénytelen kanonikus place adat: ${label}`);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function optionalStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value.filter((item) => item.trim() !== "") : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNavigation(value: unknown) {
  if (!isRecord(value)) return undefined;
  const mapsUrl = optionalString(value.maps_url);
  const directionsUrl = optionalString(value.directions_url);
  return mapsUrl || directionsUrl ? { mapsUrl, directionsUrl } : undefined;
}

function formatWeeklyOpeningHours(value: unknown) {
  if (!isRecord(value)) return undefined;
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const ranges = days.map((day) => {
    const periods = value[day];
    if (!Array.isArray(periods) || periods.length !== 1 || !isRecord(periods[0])) return undefined;
    const open = optionalString(periods[0].open);
    const close = optionalString(periods[0].close);
    return open && close ? `${open}–${close}` : undefined;
  });
  if (ranges.some((range) => !range)) return undefined;
  if (ranges.every((range) => range === ranges[0])) return `Minden nap: ${ranges[0]}`;
  if (ranges.slice(0, 6).every((range) => range === ranges[0]) && ranges[6]) return `H–Szo: ${ranges[0]} · V: ${ranges[6]}`;
  return undefined;
}

const SHOP_SERVICE_LABELS: Record<string, string> = {
  parking: "Parkolás",
  bancomat: "Bankkártyás fizetés",
  credit_card: "Bankkártyás fizetés",
  meal_vouchers: "Étkezési utalvány",
  home_delivery: "Házhoz szállítás",
};

const SHOP_DEPARTMENT_LABELS: Record<string, string> = {
  fresh_bakery: "Pékség",
  fresh_fruit: "Zöldség-gyümölcs",
  fresh_fish: "Halpult",
  butcher: "Hentes",
  gastronomy: "Gasztronómia",
  wine: "Borválaszték",
  local_products: "Helyi termékek",
};

const BEACH_SERVICE_LABELS: Record<string, string> = {
  wc: "Mosdó",
  shower: "Zuhany",
  changing_room: "Öltöző",
  nursery: "Gyerekhelyiség",
  lifeguard: "Vízi mentő",
  accessible: "Akadálymentes megközelítés",
  sunbed_rental: "Napágybérlés",
  umbrella_rental: "Napernyőbérlés",
  bar: "Büfé",
  restaurant_nearby: "Közeli étterem",
  water_sports: "Vízi sport",
  pedalo: "Vízibicikli",
  canoe: "Kenu",
};

const GENERIC_SERVICE_LABELS: Record<string, string> = {
  parking: "Parkolás",
  prm_assistance: "Akadálymentes segítség",
  rail_station: "Vasútállomás",
  wifi: "Wi‑Fi",
  fuel: "Üzemanyag",
  commercial_area: "Üzletek",
  shipyard: "Hajószerviz",
  wc: "Mosdó",
  water: "Vízvételi lehetőség",
  indoor: "Beltéri rész",
};

const RESTAURANT_PROFILE_LABELS: Record<string, string> = {
  breakfast: "Reggeli", brunch: "Brunch", lunch: "Ebéd", quick_lunch: "Gyors ebéd",
  beach_lunch: "Strandebéd", dinner: "Vacsora", quick_dinner: "Gyors vacsora",
  casual_dinner: "Laza vacsora", quick_meal: "Gyors étkezés", aperitivo: "Aperitivo",
  coffee: "Kávé", drinks: "Italok", wine: "Bor", pizza: "Pizza", bar: "Bár", takeaway: "Elvitel",
  quick_stop: "Gyors megálló", marina_stop: "Kikötői megálló", beach_stop: "Strand melletti megálló",
};

const CUISINE_LABELS: Record<string, string> = {
  seafood: "Tengeri", grill: "Grill", sardinian: "Szardíniai", street_food: "Street food",
  italian: "Olasz", pizza: "Pizza", casual: "Laza", poke: "Poke", healthy: "Egészségtudatos", bakery: "Pékség",
};

const FOOD_SERVICE_LABELS: Record<string, string> = {
  reservation: "Foglalás elérhető",
  walk_in: "Bejelentkezés nélkül is",
  takeaway: "Elvitel",
  outdoor_seating: "Kültéri ülőhely",
  vegan_options: "Vegán lehetőség",
  gluten_free: "Gluténmentes lehetőség",
};

function contactFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const contact = isRecord(raw.contact)
    ? raw.contact
    : intelligence && isRecord(intelligence.contact)
      ? intelligence.contact
      : undefined;
  if (!contact) return undefined;
  const rawPhone = contact.phone ?? contact.phones;
  const phones = optionalStringArray(rawPhone) ?? (optionalString(rawPhone) ? [optionalString(rawPhone)!] : undefined);
  const website = optionalString(contact.website);
  return phones?.length || website ? { phones, website } : undefined;
}

function accessFactsFor(accessRecord: UnknownRecord | undefined): PlaceAccess | undefined {
  if (!accessRecord) return undefined;
  const stroller: PlaceAccess["stroller"] = accessRecord.stroller === "possible" || accessRecord.stroller === "limited"
    ? accessRecord.stroller
    : undefined;
  const result: PlaceAccess = {
    characteristics: optionalStringArray(accessRecord.characteristics),
    serpentineRoad: optionalBoolean(accessRecord.serpentineRoad),
    dirtRoad: optionalBoolean(accessRecord.dirtRoad),
    mainRoad: optionalBoolean(accessRecord.mainRoad),
    coastalRoad: optionalBoolean(accessRecord.coastalRoad),
    steps: optionalBoolean(accessRecord.steps),
    stroller,
    accessible: optionalBoolean(accessRecord.accessible),
    roadNotes: optionalString(accessRecord.road_notes) ?? optionalString(accessRecord.roadNotes),
    parkingNotes: optionalString(accessRecord.parkingNotes),
    notes: optionalString(accessRecord.notes),
  };
  return Object.values(result).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)) ? result : undefined;
}

/** Keep only source-confirmed family suitability. This is deliberately not
 * inferred from beach type, services, or the presence of a playground. */
function familyFactsFor(familyRecord: UnknownRecord | undefined) {
  if (!familyRecord) return undefined;
  const toddlerFriendly = familyRecord.toddler_friendly;
  const facts = toddlerFriendly === true
    ? ["Kisgyerekkel is alkalmas"]
    : toddlerFriendly === "short_visit_possible"
      ? ["Rövid látogatás kisgyerekkel is lehetséges"]
      : [];
  return facts.length ? facts : undefined;
}

function beachDetailsFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const beach = intelligence && isRecord(intelligence.beach) ? intelligence.beach : undefined;
  const accessRecord = isRecord(raw.access)
    ? raw.access
    : intelligence && isRecord(intelligence.access)
      ? intelligence.access
      : undefined;
  const parking = intelligence && isRecord(intelligence.parking) ? intelligence.parking : undefined;
  const services = intelligence && isRecord(intelligence.services) ? intelligence.services : undefined;
  const family = intelligence && isRecord(intelligence.family) ? intelligence.family : undefined;
  const shoreType: BeachDetails["shoreType"] = beach && (beach.shore_type === "sandy" || beach.shore_type === "pebbly" || beach.shore_type === "rocky")
    ? beach.shore_type
    : undefined;
  const landAccess: BeachDetails["landAccess"] = beach && (beach.land_access === "easy" || beach.land_access === "moderate" || beach.land_access === "hard" || beach.land_access === "no_access")
    ? beach.land_access
    : undefined;
  const baseAccess = accessFactsFor(accessRecord);
  const parkingNotes = baseAccess?.parkingNotes ?? optionalString(parking?.notes);
  const access: BeachAccess | undefined = baseAccess || parkingNotes ? { ...baseAccess, parkingNotes } : undefined;
  const confirmedServices = services
    ? Object.entries(services)
      .filter(([, value]) => value === true)
      .map(([key]) => BEACH_SERVICE_LABELS[key])
      .filter((service): service is string => Boolean(service))
    : undefined;
  return {
    shoreType,
    shoreDescription: beach ? optionalString(beach.shore) : undefined,
    lengthM: beach ? optionalNumber(beach.length_m) : undefined,
    landAccess,
    waterEntry: beach ? optionalString(beach.water_entry) : undefined,
    shallowWater: beach ? optionalBoolean(beach.shallow_water) : undefined,
    windExposure: beach ? optionalString(beach.wind_exposure) : undefined,
    access,
    parking: parking ? {
      available: optionalBoolean(parking.available),
      paid: optionalBoolean(parking.paid),
      seasonal: optionalBoolean(parking.seasonal),
      walkDistanceM: optionalNumber(parking.walk_distance_m),
      notes: optionalString(parking.notes),
    } : undefined,
    confirmedServices: confirmedServices?.length ? [...new Set(confirmedServices)] : undefined,
    familyFacts: familyFactsFor(family),
    familyInsight: family ? optionalString(family.insight) : undefined,
  };
}

function foodFactsFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const regionalImport = intelligence && isRecord(intelligence.regional_import) ? intelligence.regional_import : undefined;
  const regionalDetails = regionalImport && isRecord(regionalImport.details) ? regionalImport.details : undefined;
  const food = regionalDetails && isRecord(regionalDetails.food) ? regionalDetails.food : undefined;
  const mealProfiles = food
    ? optionalStringArray(food.profiles)?.map((profile) => RESTAURANT_PROFILE_LABELS[profile]).filter((value): value is string => Boolean(value))
    : undefined;
  const cuisine = food
    ? optionalStringArray(food.cuisine)?.map((value) => CUISINE_LABELS[value]).filter((value): value is string => Boolean(value))
    : undefined;
  const confirmedServices = food
    ? Object.entries(food)
      .filter(([key, value]) => (value === "confirmed" || value === "available") && FOOD_SERVICE_LABELS[key])
      .map(([key]) => FOOD_SERVICE_LABELS[key])
    : undefined;
  const rawOpeningHours = food ? optionalString(food.opening_hours) : undefined;
  const openingHours = rawOpeningHours === "conflicting_sources" || rawOpeningHours === "unknown"
    ? undefined
    : rawOpeningHours;
  return {
    mealProfiles: mealProfiles?.length ? [...new Set(mealProfiles)] : undefined,
    cuisine: cuisine?.length ? [...new Set(cuisine)] : undefined,
    confirmedServices: confirmedServices?.length ? [...new Set(confirmedServices)] : undefined,
    openingHours,
  };
}

function parkingFactsFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const regionalImport = intelligence && isRecord(intelligence.regional_import) ? intelligence.regional_import : undefined;
  const regionalDetails = regionalImport && isRecord(regionalImport.details) ? regionalImport.details : undefined;
  const parking = regionalDetails && isRecord(regionalDetails.parking) ? regionalDetails.parking : undefined;
  if (!parking) return undefined;
  const result = {
    available: parking.available === "confirmed" ? true : undefined,
    paid: parking.paid === "confirmed" ? true : undefined,
    chargingWindow: optionalString(parking.charging_window),
    price: optionalString(parking.price),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

function shopDetailsFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  if (!intelligence) return undefined;
  const openingHours = isRecord(intelligence.opening_hours) ? intelligence.opening_hours : undefined;
  const services = optionalStringArray(intelligence.services)
    ?.map((service) => SHOP_SERVICE_LABELS[service])
    .filter((service): service is string => Boolean(service));
  const shopping = isRecord(intelligence.shopping) ? intelligence.shopping : undefined;
  const inventory = shopping && isRecord(shopping.inventory) ? shopping.inventory : undefined;
  const confirmedDepartments = inventory
    ? Object.entries(inventory)
      .filter(([, status]) => status === "confirmed")
      .map(([key]) => SHOP_DEPARTMENT_LABELS[key])
      .filter((department): department is string => Boolean(department))
    : undefined;
  const family = shopping && isRecord(shopping.family) ? shopping.family : undefined;
  const contact = contactFor(raw);
  const phones = contact?.phones;
  const website = contact?.website;
  const result = {
    openingHours: openingHours ? formatWeeklyOpeningHours(openingHours.weekly) : undefined,
    openingNote: openingHours ? optionalString(openingHours.seasonal_or_exception_note) : undefined,
    phones,
    website,
    services: services?.length ? [...new Set(services)] : undefined,
    confirmedDepartments: confirmedDepartments?.length ? [...new Set(confirmedDepartments)] : undefined,
    familyInsight: family ? optionalString(family.insight) : undefined,
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

function genericDetailsFor(raw: UnknownRecord, type: GenericPlaceType) {
  if (type === "shop") return { kind: type, shop: shopDetailsFor(raw) };
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const accessRecord = intelligence && isRecord(intelligence.access) ? intelligence.access : undefined;
  const services = intelligence && isRecord(intelligence.services) ? intelligence.services : undefined;
  const family = intelligence && isRecord(intelligence.family) ? intelligence.family : undefined;
  const opening = intelligence && isRecord(intelligence.opening_hours) ? intelligence.opening_hours : undefined;
  const food = foodFactsFor(raw);
  const parking = type === "parking" ? parkingFactsFor(raw) : undefined;
  const openingHours = opening
    ? [
      optionalString(opening.office_daily) ? `Iroda: ${optionalString(opening.office_daily)}` : undefined,
      optionalString(opening.fuel_daily) ? `Üzemanyag: ${optionalString(opening.fuel_daily)}` : undefined,
    ].filter((value): value is string => Boolean(value))
    : undefined;
  return {
    kind: type,
    parking,
    access: accessFactsFor(accessRecord),
    food: food.mealProfiles?.length || food.cuisine?.length ? food : undefined,
    confirmedServices: services
      ? Object.entries(services)
        .filter(([, value]) => value === true)
        .map(([key]) => GENERIC_SERVICE_LABELS[key])
        .filter((service): service is string => Boolean(service))
      : undefined,
    familyFacts: familyFactsFor(family),
    familyInsight: family ? optionalString(family.insight) : undefined,
    openingHours: openingHours?.length ? openingHours : undefined,
    openingNote: opening ? optionalString(opening.notes) : undefined,
  };
}

/** A Maps search hand-off is derived only from an already-approved place name
 * and locality. It deliberately does not claim a route, coordinate or duration. */
function mapsSearchNavigation(name: string, location?: { locality?: string; address?: string }) {
  const query = [name, location?.address ?? location?.locality].filter(Boolean).join(", ");
  return query ? { mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` } : undefined;
}

function navigationFor(raw: UnknownRecord, name: string, location?: { locality?: string; address?: string }) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  return optionalNavigation(raw.google_maps)
    ?? (intelligence ? optionalNavigation(intelligence.google_maps) : undefined)
    ?? mapsSearchNavigation(name, location);
}

function provenanceFor(value: unknown) {
  if (Array.isArray(value)) {
    const entries = value.filter(isRecord);
    const sourceUrls = entries.map((entry) => optionalString(entry.url)).filter((url): url is string => Boolean(url));
    const reviewedAt = entries.map((entry) => optionalString(entry.checked_at)).find(Boolean);
    return sourceUrls.length || reviewedAt ? { sourceUrls, reviewedAt } : undefined;
  }
  if (!isRecord(value)) return undefined;
  const sourceUrls = optionalStringArray(value.sources);
  const reviewedAt = optionalString(value.last_checked);
  const reviewStatus = optionalString(value.status);
  const uncertaintyNote = optionalString(value.uncertainty_note);
  return sourceUrls || reviewedAt || reviewStatus || uncertaintyNote
    ? { sourceUrls, reviewedAt, reviewStatus, uncertaintyNote }
    : undefined;
}

function intelligenceFor(raw: UnknownRecord) {
  const coverage = isRecord(raw.coverage)
    ? Object.fromEntries(Object.entries(raw.coverage).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : undefined;
  const openQuestions = optionalStringArray(raw.open_questions);
  const cover = isRecord(raw.cover_image) ? raw.cover_image : undefined;
  const supportingVisuals = Array.isArray(raw.supporting_visuals)
    ? raw.supporting_visuals.filter(isRecord).map((visual) => ({
      role: optionalString(visual.role),
      assetUrl: optionalString(visual.asset_url),
      sourceUrl: optionalString(visual.source_url),
      sourceType: optionalString(visual.source_type),
      license: optionalString(visual.license),
      attribution: optionalString(visual.attribution),
      checkedAt: optionalString(visual.checked_at),
      captureDate: optionalString(visual.capture_date),
      observation: optionalString(visual.observation),
    }))
    : undefined;
  const evidence = Array.isArray(raw.provenance)
    ? raw.provenance.filter(isRecord).map((entry) => ({
      sourceType: optionalString(entry.source_type),
      url: optionalString(entry.url),
      supports: optionalStringArray(entry.supports),
      checkedAt: optionalString(entry.checked_at),
    }))
    : undefined;
  const details = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const coverImage = cover ? {
    assetUrl: optionalString(cover.asset_url),
    sourceUrl: optionalString(cover.source_url),
    sourceType: optionalString(cover.source_type),
    license: optionalString(cover.license),
    attribution: optionalString(cover.attribution),
    checkedAt: optionalString(cover.checked_at),
  } : undefined;
  const checkedAt = optionalString(raw.checked_at);

  return coverage || openQuestions || coverImage || supportingVisuals?.length || evidence || details || checkedAt
    ? { coverage, openQuestions, coverImage, supportingVisuals, evidence, details, checkedAt }
    : undefined;
}

function validateBeaches(source: unknown): BeachPlace[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error("Érvénytelen kanonikus beach adatfájl.");
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus beach rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    if (raw.category !== "beach") throw new Error(`Érvénytelen beach kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált place slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;
    const beachDetails = beachDetailsFor(raw);

    return {
      sourceId,
      slug,
      name,
      type: "beach",
      location,
      navigation: navigationFor(raw, name, location),
      contact: contactFor(raw),
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: { kind: "beach", ...beachDetails },
    };
  });
}

function validateRestaurants(source: unknown): RestaurantPlace[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error("Érvénytelen kanonikus restaurant adatfájl.");
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus restaurant rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    const subcategory = optionalString(raw.subcategory);
    if (raw.category !== "food" || !subcategory?.startsWith("restaurant")) throw new Error(`Érvénytelen restaurant kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált place slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;
    const openingHours = isRecord(raw.opening_hours) ? raw.opening_hours : undefined;
    const placeContact = contactFor(raw);
    const openingNote = openingHours ? optionalString(openingHours.seasonal_or_exception_note) : undefined;
    const food = foodFactsFor(raw);

    return {
      sourceId,
      slug,
      name,
      type: "restaurant",
      location,
      navigation: navigationFor(raw, name, location),
      contact: placeContact,
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: {
        kind: "restaurant",
        ...food,
        openingNote,
        contact: placeContact,
      },
    };
  });
}

type GenericPlaceType = Exclude<PlaceType, "beach" | "restaurant">;

function validateGenericPlaces(source: unknown, type: GenericPlaceType, category: string, label: string): Place[] {
  if (!isRecord(source) || !Array.isArray(source.places)) throw new Error(`Érvénytelen kanonikus ${label} adatfájl.`);
  const slugs = new Set<string>();

  return source.places.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Érvénytelen kanonikus ${label} rekord: ${index + 1}.`);
    const sourceId = requiredString(raw.id, `places[${index}].id`);
    const slug = requiredString(raw.slug, `places[${index}].slug`);
    const name = requiredString(raw.name, `places[${index}].name`);
    if (raw.category !== category) throw new Error(`Érvénytelen ${label} kategória: ${slug}.`);
    if (slugs.has(slug)) throw new Error(`Duplikált ${label} slug: ${slug}.`);
    slugs.add(slug);

    const rawLocation = isRecord(raw.location) ? raw.location : undefined;
    const location = rawLocation ? {
      locality: optionalString(rawLocation.city),
      address: optionalString(rawLocation.address),
      latitude: optionalNumber(rawLocation.latitude),
      longitude: optionalNumber(rawLocation.longitude),
    } : undefined;

    return {
      sourceId,
      slug,
      name,
      type,
      location,
      navigation: navigationFor(raw, name, location),
      contact: contactFor(raw),
      provenance: provenanceFor(raw.provenance ?? raw.verification),
      intelligence: intelligenceFor(raw),
      details: genericDetailsFor(raw, type),
    };
  });
}

function assertUniqueSlugs(records: readonly Place[]) {
  const slugs = new Set<string>();
  records.forEach((place) => {
    if (slugs.has(place.slug)) throw new Error(`Duplikált place slug: ${place.slug}.`);
    slugs.add(place.slug);
  });
}

function validateSlugAliases(source: unknown, records: readonly Place[]) {
  if (!isRecord(source) || !isRecord(source.aliases)) throw new Error("Érvénytelen place slug alias adatfájl.");
  const canonicalSlugs = new Set(records.map((place) => place.slug));
  const aliases: Record<string, string> = {};

  Object.entries(source.aliases).forEach(([alias, canonical]) => {
    if (!alias || typeof canonical !== "string" || !canonicalSlugs.has(canonical) || canonicalSlugs.has(alias)) {
      throw new Error(`Érvénytelen place slug alias: ${alias}.`);
    }
    aliases[alias] = canonical;
  });

  return Object.freeze(aliases);
}

function retiredSlugSet(source: unknown) {
  if (!isRecord(source) || !isRecord(source.aliases)) {
    throw new Error("Érvénytelen place slug alias adatfájl.");
  }

  return new Set(Object.keys(source.aliases));
}

const loadedPlaces = [
  ...validateBeaches(beachesJson),
  ...validateRestaurants(restaurantsJson),
  ...validateGenericPlaces(sightsJson, "sight", "sight", "sight"),
  ...validateGenericPlaces(playgroundsJson, "playground", "playground", "playground"),
  ...validateGenericPlaces(cafesJson, "cafe", "cafe", "cafe"),
  ...validateGenericPlaces(shopsJson, "shop", "shop", "shop"),
  ...validateGenericPlaces(parkingJson, "parking", "parking", "parking"),
  ...validateGenericPlaces(otherJson, "other", "other", "other"),
];
const retiredPlaceSlugs = retiredSlugSet(slugAliasesJson);
const canonicalLoadedPlaces = loadedPlaces.filter((place) => !retiredPlaceSlugs.has(place.slug));
assertUniqueSlugs(canonicalLoadedPlaces);
const places = Object.freeze(canonicalLoadedPlaces);
const placeSlugAliases = validateSlugAliases(slugAliasesJson, places);

export function getPlaces(): readonly Place[] {
  return places;
}

export function getPlacesByType(type: PlaceType): readonly Place[] {
  return places.filter((place) => place.type === type);
}

export function getPlaceBySlug(slug: string): Place | undefined {
  const canonicalSlug = placeSlugAliases[slug] ?? slug;
  return places.find((place) => place.slug === canonicalSlug);
}

export function toPlaceSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
