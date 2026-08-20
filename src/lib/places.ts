import beachesJson from "../../knowledge/places/beaches.json";
import restaurantsJson from "../../knowledge/places/restaurants.json";
import sightsJson from "../../knowledge/places/sights.json";
import playgroundsJson from "../../knowledge/places/playgrounds.json";
import cafesJson from "../../knowledge/places/cafes.json";
import shopsJson from "../../knowledge/places/shops.json";
import otherJson from "../../knowledge/places/other.json";
import parkingJson from "../../knowledge/places/parking.json";
import slugAliasesJson from "../../knowledge/places/slug-aliases.json";
import type { BeachPlace, Place, PlaceType, RestaurantPlace } from "@/types/places";

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

function beachDetailsFor(raw: UnknownRecord) {
  const intelligence = isRecord(raw.destination_intelligence) ? raw.destination_intelligence : undefined;
  const accessRecord = isRecord(raw.access)
    ? raw.access
    : intelligence && isRecord(intelligence.access)
      ? intelligence.access
      : undefined;
  const parking = intelligence && isRecord(intelligence.parking) ? intelligence.parking : undefined;
  const services = intelligence && isRecord(intelligence.services) ? intelligence.services : undefined;
  const access = accessRecord || parking ? {
    characteristics: accessRecord ? optionalStringArray(accessRecord.characteristics) : undefined,
    serpentineRoad: accessRecord ? optionalBoolean(accessRecord.serpentineRoad) : undefined,
    dirtRoad: accessRecord ? optionalBoolean(accessRecord.dirtRoad) : undefined,
    mainRoad: accessRecord ? optionalBoolean(accessRecord.mainRoad) : undefined,
    coastalRoad: accessRecord ? optionalBoolean(accessRecord.coastalRoad) : undefined,
    parkingNotes: (accessRecord ? optionalString(accessRecord.parkingNotes) : undefined) ?? optionalString(parking?.notes),
    notes: accessRecord ? optionalString(accessRecord.notes) : undefined,
  } : undefined;
  const confirmedServices = services
    ? Object.entries(services)
      .filter(([, value]) => value === true)
      .map(([key]) => BEACH_SERVICE_LABELS[key])
      .filter((service): service is string => Boolean(service))
    : undefined;
  return {
    access,
    confirmedServices: confirmedServices?.length ? [...new Set(confirmedServices)] : undefined,
  };
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
  const services = intelligence && isRecord(intelligence.services) ? intelligence.services : undefined;
  const family = intelligence && isRecord(intelligence.family) ? intelligence.family : undefined;
  const opening = intelligence && isRecord(intelligence.opening_hours) ? intelligence.opening_hours : undefined;
  const openingHours = opening
    ? [
      optionalString(opening.office_daily) ? `Iroda: ${optionalString(opening.office_daily)}` : undefined,
      optionalString(opening.fuel_daily) ? `Üzemanyag: ${optionalString(opening.fuel_daily)}` : undefined,
    ].filter((value): value is string => Boolean(value))
    : undefined;
  return {
    kind: type,
    confirmedServices: services
      ? Object.entries(services)
        .filter(([, value]) => value === true)
        .map(([key]) => GENERIC_SERVICE_LABELS[key])
        .filter((service): service is string => Boolean(service))
      : undefined,
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
