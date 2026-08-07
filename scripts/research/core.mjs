import { readFile } from "node:fs/promises";
import path from "node:path";

export const PLACE_CATEGORIES = {
  beach: { file: "beaches.json", category: "beach" },
  restaurant: { file: "restaurants.json", category: "food" },
  cafe: { file: "cafes.json", category: "cafe" },
  playground: { file: "playgrounds.json", category: "playground" },
  shop: { file: "shops.json", category: "shop" },
  sight: { file: "sights.json", category: "sight" },
};

export const FACT_FIELDS = {
  beach: new Set(["name", "location.city", "verification", "access"]),
  restaurant: new Set(["name", "location.city", "location.address", "contact.phone", "contact.website", "opening_hours", "verification"]),
  cafe: new Set(["name", "location.city", "location.address", "contact.phone", "contact.website", "verification"]),
  playground: new Set(["name", "location.city", "location.address", "verification"]),
  shop: new Set(["name", "location.city", "location.address", "contact.phone", "contact.website", "verification"]),
  sight: new Set(["name", "location.city", "location.address", "verification"]),
};

const SOURCE_TYPES = new Set(["official_business", "municipality", "government", "tourism_authority", "official_organizer", "reliable_listing", "secondary"]);
const ACTIONS = new Set(["add", "update", "no_change", "hold"]);
const STATUSES = new Set(["ready_for_approval", "needs_review", "hold"]);
const MODES = new Set(["discover", "enrich", "verify"]);

function fail(message) { throw new Error(message); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmptyString(value) { return typeof value === "string" && value.trim() !== ""; }

export function normalizeIdentity(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hu").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function placeTypeForRaw(raw) {
  if (!isRecord(raw)) return undefined;
  if (raw.category === "beach") return "beach";
  if (raw.category === "food" && typeof raw.subcategory === "string" && raw.subcategory.startsWith("restaurant")) return "restaurant";
  return Object.entries(PLACE_CATEGORIES).find(([, config]) => config.category === raw.category)?.[0];
}

export async function loadCanonicalPlaces(root = process.cwd()) {
  const directory = path.join(root, "knowledge", "places");
  const records = [];
  for (const [type, config] of Object.entries(PLACE_CATEGORIES)) {
    const document = JSON.parse(await readFile(path.join(directory, config.file), "utf8"));
    if (!Array.isArray(document.places)) fail(`Érvénytelen kanonikus Place fájl: ${config.file}`);
    for (const raw of document.places) {
      if (!isRecord(raw) || !nonEmptyString(raw.slug) || !nonEmptyString(raw.name)) fail(`Érvénytelen Place rekord: ${config.file}`);
      records.push({ type, raw });
    }
  }
  const slugs = new Set();
  for (const record of records) {
    if (slugs.has(record.raw.slug)) fail(`Duplikált kanonikus slug: ${record.raw.slug}`);
    slugs.add(record.raw.slug);
  }
  return records;
}

export function validateResearchJob(job) {
  if (!isRecord(job) || !MODES.has(job.mode)) fail("Érvénytelen ResearchJob mód.");
  if (job.placeTypes !== undefined && (!Array.isArray(job.placeTypes) || job.placeTypes.some((type) => !(type in PLACE_CATEGORIES)))) fail("Érvénytelen ResearchJob Place típus.");
  if (job.slugs !== undefined && (!Array.isArray(job.slugs) || job.slugs.some((slug) => !nonEmptyString(slug)))) fail("Érvénytelen ResearchJob slug lista.");
  if (job.verificationAgeDays !== undefined && (!Number.isInteger(job.verificationAgeDays) || job.verificationAgeDays < 1)) fail("Érvénytelen ResearchJob ellenőrzési kor.");
  return job;
}

function sourceMap(sources) {
  if (!Array.isArray(sources)) fail("A sourceCatalog kötelező.");
  const result = new Map();
  for (const source of sources) {
    if (!isRecord(source) || !nonEmptyString(source.id) || !nonEmptyString(source.url) || !nonEmptyString(source.title) || !nonEmptyString(source.domain) || !SOURCE_TYPES.has(source.sourceType) || !nonEmptyString(source.checkedAt)) fail("Érvénytelen kutatási forrás.");
    let url;
    try { url = new URL(source.url); } catch { fail(`Érvénytelen forrás URL: ${source.url}`); }
    if (url.protocol !== "https:" && url.protocol !== "http:") fail(`Nem HTTP(S) forrás URL: ${source.url}`);
    const sourceDomain = source.domain.toLocaleLowerCase().replace(/^www\./, "");
    const urlDomain = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
    if (sourceDomain !== urlDomain) fail(`A forrás domainje nem egyezik az URL-lel: ${source.id}`);
    if (result.has(source.id)) fail(`Duplikált forrásazonosító: ${source.id}`);
    result.set(source.id, source);
  }
  return result;
}

function candidateType(candidate, canonicalBySlug) {
  if (candidate.canonicalSlug) return canonicalBySlug.get(candidate.canonicalSlug)?.type;
  return placeTypeForRaw(candidate.proposedPlace);
}

export function validateResearchProposal(proposal, canonicalRecords) {
  if (!isRecord(proposal) || proposal.proposalVersion !== "1.0" || !nonEmptyString(proposal.createdAt)) fail("Érvénytelen ResearchProposal fejléc.");
  validateResearchJob(proposal.researchJob);
  if (!isRecord(proposal.summary) || !Array.isArray(proposal.candidates)) fail("Érvénytelen ResearchProposal szerkezet.");
  const sources = sourceMap(proposal.sourceCatalog);
  const canonicalBySlug = new Map(canonicalRecords.map((record) => [record.raw.slug, record]));
  const candidateIds = new Set();
  const proposedSlugs = new Set();

  for (const candidate of proposal.candidates) {
    if (!isRecord(candidate) || !nonEmptyString(candidate.id) || !ACTIONS.has(candidate.action) || !STATUSES.has(candidate.status) || !Array.isArray(candidate.facts)) fail("Érvénytelen ResearchProposal jelölt.");
    if (candidateIds.has(candidate.id)) fail(`Duplikált jelöltazonosító: ${candidate.id}`);
    candidateIds.add(candidate.id);
    const type = candidateType(candidate, canonicalBySlug);
    if (!type) fail(`A jelölt Place típusa nem állapítható meg: ${candidate.id}`);
    if (candidate.action === "add") {
      if (!isRecord(candidate.proposedPlace) || !nonEmptyString(candidate.proposedPlace.slug) || !nonEmptyString(candidate.proposedPlace.name) || !isRecord(candidate.proposedPlace.location) || !nonEmptyString(candidate.proposedPlace.location.city)) fail(`Hiányos ADD jelölt: ${candidate.id}`);
      if (canonicalBySlug.has(candidate.proposedPlace.slug) || proposedSlugs.has(candidate.proposedPlace.slug)) fail(`Slug ütközés: ${candidate.proposedPlace.slug}`);
      proposedSlugs.add(candidate.proposedPlace.slug);
    }
    if (candidate.action === "update" && (!nonEmptyString(candidate.canonicalSlug) || !canonicalBySlug.has(candidate.canonicalSlug) || !isRecord(candidate.proposedChanges))) fail(`Érvénytelen UPDATE jelölt: ${candidate.id}`);
    for (const fact of candidate.facts) {
      if (!isRecord(fact) || !FACT_FIELDS[type].has(fact.field) || !Array.isArray(fact.sourceRefs) || fact.sourceRefs.length === 0 || fact.sourceRefs.some((id) => !sources.has(id)) || !nonEmptyString(fact.checkedAt) || !SOURCE_TYPES.has(fact.confidenceBasis)) fail(`Érvénytelen vagy forrás nélküli fact: ${candidate.id}`);
    }
  }
  return proposal;
}

export function findLikelyDuplicates(candidate, canonicalRecords) {
  const raw = candidate.proposedPlace;
  if (!isRecord(raw)) return [];
  const name = normalizeIdentity(raw.name);
  const locality = normalizeIdentity(raw.location?.city);
  return canonicalRecords.filter((record) => normalizeIdentity(record.raw.name) === name || (locality && normalizeIdentity(record.raw.location?.city) === locality && normalizeIdentity(record.raw.slug) === normalizeIdentity(raw.slug)));
}
