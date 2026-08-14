import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCanonicalPlaces, validateResearchJob } from "./core.mjs";
import { createLiveResearchProposal, saveResearchProposal } from "./provider-openai.mjs";

const RESEARCHABLE_AREAS = new Set(["basic", "evidence", "services", "family"]);

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function unresolvedCoverage(raw) {
  if (!raw.coverage || typeof raw.coverage !== "object") return [];
  return Object.entries(raw.coverage)
    .filter(([area, status]) => RESEARCHABLE_AREAS.has(area) && (status === "missing" || status === "partial"))
    .map(([area]) => area);
}

/** Creates one deliberately narrow, review-only job per canonical Place. */
export function buildFullEnrichmentJob({ type, raw }) {
  const locality = text(raw.location?.city) ?? "ismeretlen település";
  const areas = unresolvedCoverage(raw);
  const questions = Array.isArray(raw.open_questions) ? raw.open_questions.filter(text) : [];
  const focus = [...areas, ...questions].join("; ");
  const mode = focus ? "enrich" : "verify";
  const purpose = focus
    ? `Focus only on these known gaps or open questions: ${focus}.`
    : "Verify the current identity and official source freshness only; return no_change when there is nothing clearly supported to improve.";

  const job = {
    mode,
    placeTypes: [type],
    geographicScope: { localities: [locality] },
    slugs: [raw.slug],
    query: `Research only ${raw.name} in ${locality}. ${purpose} Do not propose route distance, travel duration, parking price, coordinates, ratings, availability, or images. Do not overwrite known canonical facts. This is a review proposal only.`,
  };
  validateResearchJob(job);
  return job;
}

export async function buildFullEnrichmentPlan({ root = process.cwd() } = {}) {
  const canonical = await loadCanonicalPlaces(root);
  return canonical
    .map((record) => ({
      slug: record.raw.slug,
      name: record.raw.name,
      type: record.type,
      locality: text(record.raw.location?.city) ?? "ismeretlen település",
      job: buildFullEnrichmentJob(record),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function blocksEntireProvider(error) {
  const message = error instanceof Error ? error.message : String(error);
  // A connection outage, invalid credentials, unavailable model access or
  // inactive billing cannot succeed for the next Place either. Stop the
  // batch after the first such response instead of needlessly issuing up to
  // 138 identical failing provider calls.
  return /OpenAI research kapcsolat nem érhető el: (ENOTFOUND|EAI_AGAIN|időtúllépés)/.test(message)
    || /OpenAI research hiba \((401|403|429)\):/.test(message);
}

function argumentValue(args, flag) {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
}

function parseArguments(args) {
  const limitValue = argumentValue(args, "--limit") ?? "138";
  const limit = Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 138) {
    throw new Error("A --limit 1 és 138 közötti egész szám lehet.");
  }
  return {
    limit,
    dryRun: args.includes("--dry-run"),
    resume: !args.includes("--no-resume"),
    outputDir: argumentValue(args, "--output-dir") ?? "research/proposals/full-enrichment",
    report: argumentValue(args, "--report") ?? "research/reports/full-enrichment-progress.json",
  };
}

async function saveReport({ root, reportPath, report }) {
  const absolute = path.resolve(root, reportPath);
  const reportsRoot = path.resolve(root, "research", "reports") + path.sep;
  if (!absolute.startsWith(reportsRoot)) throw new Error("A batch riport csak a research/reports könyvtárba írható.");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
}

export async function runFullEnrichment({
  root = process.cwd(),
  options = {},
  createProposal = createLiveResearchProposal,
  saveProposal = saveResearchProposal,
  log = console.log,
} = {}) {
  const plan = await buildFullEnrichmentPlan({ root });
  const selected = plan.slice(0, options.limit ?? 138);
  const report = {
    reportVersion: "1.0",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: options.dryRun ? "dry_run" : "live_proposals_only",
    canonicalWrites: false,
    supabaseWrites: false,
    totalCanonicalPlaces: plan.length,
    selectedPlaces: selected.length,
    completed: [],
    skipped: [],
    failed: [],
  };

  if (options.dryRun) {
    report.completed = selected.map(({ slug, name, type, locality, job }) => ({ slug, name, type, locality, mode: job.mode, status: "planned" }));
    report.updatedAt = new Date().toISOString();
    if (options.report) await saveReport({ root, reportPath: options.report, report });
    return report;
  }

  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const outputPath = path.posix.join(options.outputDir, `${item.slug}.json`);
    const absoluteOutput = path.resolve(root, outputPath);
    if (options.resume && await exists(absoluteOutput)) {
      report.skipped.push({ slug: item.slug, reason: "existing_proposal" });
      log(`[${index + 1}/${selected.length}] ${item.slug}: meglévő javaslat, kihagyva.`);
    } else {
      try {
        const result = await createProposal({ job: item.job, root });
        const file = await saveProposal({ proposal: result.proposal, outputPath, root });
        report.completed.push({ slug: item.slug, file, candidates: result.proposal.summary, provider: result.provider });
        log(`[${index + 1}/${selected.length}] ${item.slug}: javaslat elkészült.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ismeretlen kutatási hiba.";
        report.failed.push({ slug: item.slug, message });
        if (blocksEntireProvider(error)) {
          report.blocked = { slug: item.slug, reason: message };
          log(`[${index + 1}/${selected.length}] ${item.slug}: a research provider nem érhető el, a batch megáll.`);
          report.updatedAt = new Date().toISOString();
          if (options.report) await saveReport({ root, reportPath: options.report, report });
          break;
        }
        log(`[${index + 1}/${selected.length}] ${item.slug}: sikertelen, folytatom a következővel.`);
      }
    }
    report.updatedAt = new Date().toISOString();
    if (options.report) await saveReport({ root, reportPath: options.report, report });
  }
  return report;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  const options = parseArguments(process.argv.slice(2));
  const report = await runFullEnrichment({ options });
  console.log(JSON.stringify({
    status: report.failed.length ? "completed_with_failures" : "completed",
    mode: report.mode,
    selectedPlaces: report.selectedPlaces,
    completed: report.completed.length,
    skipped: report.skipped.length,
    failed: report.failed.length,
    blocked: report.blocked ?? null,
    report: options.report,
    canonicalWrites: false,
  }, null, 2));
}
