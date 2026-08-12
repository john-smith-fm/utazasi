import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PLACE_CATEGORIES,
  findLikelyDuplicates,
  loadCanonicalPlaces,
  normalizeIdentity,
  validateResearchJob,
  validateResearchProposal,
} from "./core.mjs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_SOURCES = 8;
const SOURCE_TYPES = new Set(["official_business", "municipality", "government", "tourism_authority", "official_organizer", "reliable_listing", "secondary"]);
const ACTIONS = new Set(["add", "update", "no_change", "hold"]);
const STATUSES = new Set(["ready_for_approval", "needs_review", "hold"]);

function fail(message) { throw new Error(message); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmptyString(value) { return typeof value === "string" && value.trim() !== ""; }
function checkedAt() { return new Date().toISOString(); }
function sourceId(index) { return `src_${String(index + 1).padStart(2, "0")}`; }

function responseText(response) {
  if (nonEmptyString(response.output_text)) return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && nonEmptyString(content.text)) return content.text;
    }
  }
  fail("Az OpenAI válasz nem tartalmaz feldolgozható szöveget.");
}

function parseModelJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) fail("Az élő research válasz nem tartalmaz JSON-javaslatot.");
  try { return JSON.parse(trimmed.slice(start, end + 1)); }
  catch { fail("Az élő research válasz JSON-javaslata nem értelmezhető."); }
}

function addUrl(target, url, title) {
  if (!nonEmptyString(url)) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    if (!target.has(parsed.href)) target.set(parsed.href, { url: parsed.href, title: nonEmptyString(title) ? title : parsed.hostname });
  } catch { /* A provider hibás URL-je nem lehet forrás. */ }
}

export function extractProviderSources(response) {
  const urls = new Map();
  for (const item of response.output ?? []) {
    if (item.type === "web_search_call") {
      for (const source of item.action?.sources ?? []) addUrl(urls, source.url, source.title);
    }
    for (const content of item.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        const citation = annotation.url_citation ?? annotation;
        if (annotation.type === "url_citation" || citation?.url) addUrl(urls, citation.url, citation.title);
      }
    }
  }
  return [...urls.values()];
}

function canonicalContext(records, job) {
  const requested = new Set(job.placeTypes ?? Object.keys(PLACE_CATEGORIES));
  const selected = records.filter(({ type, raw }) => {
    if (!requested.has(type)) return false;
    if (job.slugs?.length && !job.slugs.includes(raw.slug)) return false;
    const localities = job.geographicScope?.localities?.map((city) => city.toLocaleLowerCase()) ?? [];
    return localities.length === 0 || localities.includes(String(raw.location?.city ?? "").toLocaleLowerCase());
  });
  return selected.map(({ type, raw }) => ({ type, slug: raw.slug, name: raw.name, city: raw.location?.city, address: raw.location?.address, website: raw.contact?.website, lastChecked: raw.verification?.last_checked }));
}

function researchPrompt(job, knownPlaces) {
  return `You are the server-side research provider for a private family travel knowledge base. Research only the constrained task below using the web search tool. Return JSON only, without Markdown or citations in prose.\n\nRules:\n- This is a proposal, never a final database write.\n- Never invent facts, URLs, addresses, hours, coordinates, prices, ratings, closure status, or child-friendliness. Unknown data must be omitted.\n- Every fact in add/update candidates must cite one or more URL values from the web pages you actually used.\n- Prefer official businesses, municipalities, government, tourism authorities and official organizers.\n- If identity, source quality, or freshness is uncertain, return needs_review or hold.\n- Do not mark a closure or rename ready_for_approval from a weak signal.\n- For updates, only propose missing or stale factual fields; do not overwrite existing facts.\n- For adds, proposedPlace needs name, slug, and location.city. Use a lowercase hyphen slug.\n\nReturn this exact shape:\n{\n  "candidates": [\n    {\n      "id": "short-stable-id",\n      "action": "add|update|no_change|hold",\n      "status": "ready_for_approval|needs_review|hold",\n      "canonicalSlug": "only-for-known-place",\n      "proposedPlace": { "name": "only-for-add", "slug": "only-for-add", "location": { "city": "required-for-add", "address": "optional" }, "contact": { "phone": ["optional"], "website": "optional" }, "opening_hours": "optional object", "verification": "optional object" },\n      "proposedChanges": { "only-for-update": "fields missing from the known place" },\n      "facts": [{ "field": "one supported field path", "value": "the supported value", "sourceUrls": ["https://actual-source"], "confidenceBasis": "official_business|municipality|government|tourism_authority|official_organizer|reliable_listing|secondary" }],\n      "uncertaintyNotes": ["optional"]\n    }\n  ]\n}\n\nSupported fact field paths are name, location.city, location.address, contact.phone, contact.website, opening_hours, verification, and access. Limit yourself to ${MAX_SOURCES} distinct URLs and 8 candidates.\n\nResearch job:\n${JSON.stringify(job)}\n\nKnown canonical places in scope (use these exact slugs for updates; do not duplicate them):\n${JSON.stringify(knownPlaces)}`;
}

function categoryDefaults(type, proposedPlace) {
  const record = structuredClone(proposedPlace ?? {});
  const normalized = normalizeIdentity(record.slug || record.name);
  if (!normalized || !nonEmptyString(record.name) || !nonEmptyString(record.location?.city)) fail("Az ADD jelölt nem tartalmaz elegendő Place-azonosítót.");
  record.slug = normalized;
  record.id ||= `place_${type === "restaurant" ? "rest" : type}_${normalized.replaceAll("-", "_")}`;
  if (type === "restaurant") {
    record.category = "food";
    record.subcategory ||= "restaurant";
  } else record.category = PLACE_CATEGORIES[type].category;
  return record;
}

function sourceCatalogFrom(providerSources, candidateSources, timestamp) {
  const allowed = new Map(providerSources.map((source) => [source.url, source]));
  const selected = [...candidateSources].filter((url) => allowed.has(url)).slice(0, MAX_SOURCES);
  if (selected.length === 0) fail("A modell nem hivatkozott a provider által igazolt webes forrásra.");
  return selected.map((url, index) => {
    const source = allowed.get(url);
    const parsed = new URL(url);
    return { id: sourceId(index), url, title: source.title, domain: parsed.hostname.replace(/^www\./, ""), sourceType: "secondary", checkedAt: timestamp };
  });
}

function proposalFromModel({ modelOutput, job, canonical, providerSources, timestamp }) {
  if (!isRecord(modelOutput) || !Array.isArray(modelOutput.candidates)) fail("Az élő kutatás nem a várt jelöltlistát adta vissza.");
  const canonicalBySlug = new Map(canonical.map((record) => [record.raw.slug, record]));
  const urls = new Set();
  for (const candidate of modelOutput.candidates) for (const fact of candidate?.facts ?? []) for (const url of fact?.sourceUrls ?? []) if (nonEmptyString(url)) urls.add(url);
  const sourceCatalog = sourceCatalogFrom(providerSources, urls, timestamp);
  const sourceByUrl = new Map(sourceCatalog.map((source) => [source.url, source]));

  const candidates = modelOutput.candidates.slice(0, 8).map((raw) => {
    if (!isRecord(raw) || !nonEmptyString(raw.id) || !ACTIONS.has(raw.action) || !STATUSES.has(raw.status)) fail("Az élő kutatás érvénytelen jelöltet adott.");
    const type = raw.canonicalSlug ? canonicalBySlug.get(raw.canonicalSlug)?.type : undefined;
    const candidate = { id: normalizeIdentity(raw.id), action: raw.action, status: raw.status, facts: [] };
    if (!candidate.id) fail("A kutatási jelölt azonosítója érvénytelen.");
    if (raw.canonicalSlug) candidate.canonicalSlug = raw.canonicalSlug;
    if (raw.action === "add") {
      const inferredType = raw.placeType ?? (job.placeTypes?.length === 1 ? job.placeTypes[0] : undefined);
      if (typeof inferredType !== "string" || !(inferredType in PLACE_CATEGORIES) || (job.placeTypes?.length && !job.placeTypes.includes(inferredType))) fail("Az élő ADD jelölt Place típusa nincs a ResearchJob scope-jában.");
      candidate.proposedPlace = categoryDefaults(inferredType, raw.proposedPlace);
    } else if (raw.action === "update") {
      if (!type || !isRecord(raw.proposedChanges)) fail("Az élő UPDATE jelölt hiányos vagy ismeretlen Place-re mutat.");
      candidate.proposedChanges = raw.proposedChanges;
    }
    for (const fact of raw.facts ?? []) {
      if (!isRecord(fact) || !nonEmptyString(fact.field) || !Array.isArray(fact.sourceUrls)) fail("Az élő kutatás forrás nélküli tényt adott.");
      const sourceRefs = fact.sourceUrls.filter((url) => sourceByUrl.has(url)).map((url) => sourceByUrl.get(url).id);
      if (sourceRefs.length === 0) fail("A kutatási tény URL-je nem az élő provider forrásából származik.");
      const basis = SOURCE_TYPES.has(fact.confidenceBasis) ? fact.confidenceBasis : "secondary";
      for (const ref of sourceRefs) sourceCatalog.find((source) => source.id === ref).sourceType = basis;
      if (fact.kind !== undefined && fact.kind !== "extracted_fact") fail("A kanonikus tényjelölt csak extracted_fact lehet.");
      candidate.facts.push({ kind: "extracted_fact", field: fact.field, value: fact.value, sourceRefs, checkedAt: timestamp, confidenceBasis: basis });
    }
    if (["add", "update"].includes(candidate.action) && candidate.facts.length === 0) fail("Az élő ADD vagy UPDATE jelöltnek legalább egy forrásolt ténye kell legyen.");
    if (Array.isArray(raw.uncertaintyNotes) && raw.uncertaintyNotes.length) candidate.uncertaintyNotes = raw.uncertaintyNotes.filter(nonEmptyString).slice(0, 4);
    return candidate;
  });

  for (const candidate of candidates) {
    if (candidate.action === "add") {
      const matches = findLikelyDuplicates(candidate, canonical);
      if (matches.length) {
        candidate.status = "needs_review";
        candidate.uncertaintyNotes = [...(candidate.uncertaintyNotes ?? []), `Lehetséges duplikátum: ${matches.map(({ raw }) => raw.slug).join(", ")}.`];
      }
    }
  }
  const summary = {
    total: candidates.length,
    ready: candidates.filter((candidate) => candidate.status === "ready_for_approval").length,
    needsReview: candidates.filter((candidate) => candidate.status === "needs_review").length,
    hold: candidates.filter((candidate) => candidate.status === "hold").length,
  };
  return { proposalVersion: "1.0", createdAt: timestamp, researchJob: job, summary, candidates, sourceCatalog };
}

async function openAIResearchRequest({ apiKey, model, prompt, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          store: false,
          tools: [{ type: "web_search", search_context_size: "medium", user_location: { type: "approximate", country: "IT", city: "Villasimius", timezone: "Europe/Rome" } }],
          input: prompt,
        }),
      });
    } catch (error) {
      const detail = error?.name === "AbortError" ? "időtúllépés" : (error?.cause?.code ?? error?.message ?? "kapcsolati hiba");
      fail(`OpenAI research kapcsolat nem érhető el: ${detail}`);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) fail(`OpenAI research hiba (${response.status}): ${body.error?.message ?? "ismeretlen hiba"}`);
    return body;
  } finally { clearTimeout(timer); }
}

export async function createLiveResearchProposal({ job, root = process.cwd(), apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini", fetchImpl } = {}) {
  validateResearchJob(job);
  if (!nonEmptyString(apiKey)) fail("Hiányzik a szerveroldali OPENAI_API_KEY. A kulcsot soha ne add meg NEXT_PUBLIC_ változóként.");
  const canonical = await loadCanonicalPlaces(root);
  const response = await openAIResearchRequest({ apiKey, model, prompt: researchPrompt(job, canonicalContext(canonical, job)), fetchImpl });
  const providerSources = extractProviderSources(response);
  if (providerSources.length === 0) fail("Az élő research válasz nem adott ellenőrizhető webes forrást.");
  const proposal = proposalFromModel({ modelOutput: parseModelJson(responseText(response)), job, canonical, providerSources, timestamp: checkedAt() });
  validateResearchProposal(proposal, canonical);
  return { proposal, provider: { model, sourceCount: providerSources.length, responseId: response.id ?? null } };
}

export async function saveResearchProposal({ proposal, outputPath, root = process.cwd() }) {
  if (!nonEmptyString(outputPath)) fail("Adj meg egy proposal output fájlt a --output kapcsolóval.");
  const absolute = path.resolve(root, outputPath);
  const proposalsRoot = path.resolve(root, "research", "proposals") + path.sep;
  if (!absolute.startsWith(proposalsRoot)) fail("A kutatási javaslat csak a research/proposals könyvtárba írható.");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(proposal, null, 2)}\n`);
  return path.relative(root, absolute);
}
