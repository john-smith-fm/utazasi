import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCanonicalPlaces } from "./core.mjs";

const AREA_WEIGHT = { basic: 8, evidence: 7, services: 5, family: 4, mobility: 3, photos: 1 };
const RESEARCHABLE_AREAS = new Set(["basic", "evidence", "services", "family"]);
const TIMELINE_RELEVANCE_WEIGHT = 10;

function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(value) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function dateAgeDays(value, now) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.floor((now.getTime() - parsed) / 86_400_000)) : undefined;
}
function missingAreas(raw) {
  if (!isRecord(raw.coverage)) return [];
  return Object.entries(raw.coverage)
    .filter(([, status]) => status === "missing" || status === "partial")
    .map(([area, status]) => ({ area, status }));
}
function queueReason(areas, questions, stale) {
  const parts = [];
  if (areas.length) parts.push(areas.map(({ area, status }) => area + ": " + status).join(", "));
  if (questions.length) parts.push(String(questions.length) + " nyitott kérdés");
  if (stale !== undefined) parts.push(String(stale) + " napja ellenőrizve");
  return parts.join(" · ");
}

async function loadTimelineReferences(root) {
  const timelinePath = path.join(root, "knowledge", "trip", "timeline.initial.json");
  const document = JSON.parse(await readFile(timelinePath, "utf8"));
  if (!isRecord(document) || !Array.isArray(document.days)) {
    throw new Error("Érvénytelen kanonikus induló Timeline.");
  }

  const references = new Map();
  for (const day of document.days) {
    if (!isRecord(day) || typeof day.date !== "string" || !Array.isArray(day.activities)) continue;
    for (const activity of day.activities) {
      if (!isRecord(activity) || !text(activity.place_slug)) continue;
      const slug = text(activity.place_slug);
      if (!slug || slug === "trip-base") continue;
      const existing = references.get(slug) ?? [];
      existing.push({ date: day.date, title: text(activity.title) ?? "Névtelen program" });
      references.set(slug, existing);
    }
  }
  return references;
}

/**
 * Deterministically proposes bounded enrichment jobs from canonical coverage.
 * It does not call a provider, write canonical JSON, or claim a missing field
 * is false. A human must select a queue item before live research starts.
 */
export async function buildCoverageQueue({ root = process.cwd(), limit = 8, staleAfterDays = 90, now = new Date() } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) throw new Error("A research queue limit 1 és 8 közötti egész szám lehet.");
  const canonical = await loadCanonicalPlaces(root);
  const timelineReferences = await loadTimelineReferences(root);
  const coverage = new Map();
  const candidates = canonical.flatMap(({ type, raw }) => {
    const locality = text(raw.location?.city) ?? "Ismeretlen hely";
    const key = locality + "::" + type;
    const summary = coverage.get(key) ?? { locality, type, records: 0, queued: 0 };
    summary.records += 1;
    coverage.set(key, summary);

    const areas = missingAreas(raw);
    const questions = Array.isArray(raw.open_questions) ? raw.open_questions.filter((item) => text(item)) : [];
    const checkedAt = text(raw.checked_at) ?? text(raw.verification?.last_checked);
    const age = dateAgeDays(checkedAt, now);
    const stale = age !== undefined && age >= staleAfterDays ? age : undefined;
    const researchAreas = areas.filter((item) => RESEARCHABLE_AREAS.has(item.area));
    if (!researchAreas.length && !questions.length && stale === undefined) return [];

    const timelineUses = timelineReferences.get(raw.slug) ?? [];
    const score = researchAreas.reduce((sum, item) => sum + (AREA_WEIGHT[item.area] ?? 2) + (item.status === "missing" ? 2 : 0), 0)
      + Math.min(questions.length, 3) * 2 + (stale === undefined ? 0 : 2)
      + (timelineUses.length ? TIMELINE_RELEVANCE_WEIGHT : 0);
    summary.queued += 1;
    const focus = [...researchAreas.map((item) => item.area), ...questions].join("; ");
    return [{
      id: "enrich-" + raw.slug,
      priorityScore: score,
      target: { slug: raw.slug, name: raw.name, type, locality },
      missingAreas: areas,
      researchFocus: researchAreas.map((item) => item.area),
      openQuestions: questions,
      timelineRelevance: timelineUses.length
        ? { status: "planned", activities: timelineUses }
        : { status: "not_in_initial_timeline", activities: [] },
      freshness: checkedAt ? { checkedAt, ageDays: age, status: stale === undefined ? "current" : "stale" } : { status: "unknown" },
      reason: queueReason(areas, questions, stale),
      researchJob: {
        mode: "enrich",
        placeTypes: [type],
        geographicScope: { localities: [locality] },
        slugs: [raw.slug],
        query: "Only enrich verified missing or partial information for " + raw.name + " in " + locality + ". Focus on: " + focus + ".",
      },
    }];
  });
  candidates.sort((a, b) => b.priorityScore - a.priorityScore || a.target.locality.localeCompare(b.target.locality, "hu") || a.target.name.localeCompare(b.target.name, "hu"));
  const proposals = candidates.slice(0, limit);
  return {
    queueVersion: "1.0",
    generatedAt: now.toISOString(),
    limits: { maxJobs: limit, liveResearchStarted: false, canonicalWrites: false },
    coverageMap: [...coverage.values()].sort((a, b) => a.locality.localeCompare(b.locality, "hu") || a.type.localeCompare(b.type)),
    summary: {
      canonicalPlaces: canonical.length,
      timelineLinkedPlaces: timelineReferences.size,
      eligibleForEnrichment: candidates.length,
      proposedJobs: proposals.length,
      deferredJobs: Math.max(0, candidates.length - proposals.length),
    },
    proposals,
  };
}

export async function saveCoverageQueue({ queue, outputPath, root = process.cwd() }) {
  const absolute = path.resolve(root, outputPath);
  const queueRoot = path.resolve(root, "research", "queues") + path.sep;
  if (!absolute.startsWith(queueRoot)) throw new Error("A coverage queue csak a research/queues könyvtárba írható.");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, JSON.stringify(queue, null, 2) + "\n");
  return path.relative(root, absolute);
}
