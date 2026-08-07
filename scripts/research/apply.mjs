import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PLACE_CATEGORIES, loadCanonicalPlaces, placeTypeForRaw, validateResearchProposal } from "./core.mjs";

function fail(message) { throw new Error(message); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

function mergeMissing(existing, changes) {
  const result = structuredClone(existing);
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    if (isRecord(value) && isRecord(result[key])) result[key] = mergeMissing(result[key], value);
    else if (result[key] === undefined || result[key] === null || result[key] === "") result[key] = value;
  }
  return result;
}

function nextVersion(current) {
  const match = /^(\d+)\.(\d+)$/.exec(String(current));
  return match ? `${match[1]}.${Number(match[2]) + 1}` : "1.1";
}

function candidateType(candidate, canonicalBySlug) {
  if (candidate.canonicalSlug) return canonicalBySlug.get(candidate.canonicalSlug)?.type;
  return placeTypeForRaw(candidate.proposedPlace);
}

export async function prepareProposalApply({ proposal, approvedIds, root = process.cwd() }) {
  const canonical = await loadCanonicalPlaces(root);
  validateResearchProposal(proposal, canonical);
  if (!Array.isArray(approvedIds) || approvedIds.length === 0) fail("Legalább egy explicit jóváhagyott jelölt szükséges.");
  const candidates = new Map(proposal.candidates.map((candidate) => [candidate.id, candidate]));
  const selected = approvedIds.map((id) => candidates.get(id));
  if (selected.some((candidate) => !candidate)) fail("Ismeretlen jóváhagyott jelölt.");
  if (selected.some((candidate) => candidate.status !== "ready_for_approval" || !["add", "update"].includes(candidate.action))) fail("Csak READY ADD vagy UPDATE jelölt alkalmazható.");

  const canonicalBySlug = new Map(canonical.map((record) => [record.raw.slug, record]));
  const plans = new Map();
  for (const candidate of selected) {
    const type = candidateType(candidate, canonicalBySlug);
    const config = PLACE_CATEGORIES[type];
    const file = path.join(root, "knowledge", "places", config.file);
    let plan = plans.get(file);
    if (!plan) {
      const document = JSON.parse(await readFile(file, "utf8"));
      plan = { document, next: structuredClone(document), candidateIds: [] };
      plans.set(file, plan);
    }
    if (candidate.action === "add") plan.next.places.push(candidate.proposedPlace);
    else {
      const index = plan.next.places.findIndex((place) => place.slug === candidate.canonicalSlug);
      if (index < 0) fail(`Nem található frissítendő Place: ${candidate.canonicalSlug}`);
      plan.next.places[index] = mergeMissing(plan.next.places[index], candidate.proposedChanges);
    }
    plan.candidateIds.push(candidate.id);
  }
  const changes = new Map();
  for (const [file, plan] of plans) {
    plan.next.version = nextVersion(plan.document.version);
    plan.next.updated_at = new Date().toISOString().slice(0, 10);
    plan.next.change_log = [...(Array.isArray(plan.document.change_log) ? plan.document.change_log : []), { date: plan.next.updated_at, source: "research_proposal", candidate_ids: plan.candidateIds }];
    changes.set(file, plan.next);
  }
  return changes;
}

export async function applyPreparedChanges(changes) {
  for (const [file, document] of changes) await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
}
