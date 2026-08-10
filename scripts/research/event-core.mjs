import { readFile } from "node:fs/promises";
import path from "node:path";

const STATUSES = new Set(["ready_for_approval", "needs_review", "hold"]);
const ACTIONS = new Set(["add", "hold"]);

function fail(message) { throw new Error(message); }
function isRecord(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmpty(value) { return typeof value === "string" && value.trim() !== ""; }

export function romeDate(value) {
  if (!nonEmpty(value) || Number.isNaN(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function loadEventSeries(root = process.cwd()) {
  const document = JSON.parse(await readFile(path.join(root, "knowledge", "events", "event-series.json"), "utf8"));
  if (!Array.isArray(document.series)) fail("Az eseménysorozat adatfájl érvénytelen.");
  for (const series of document.series) {
    if (!isRecord(series) || !nonEmpty(series.id) || !nonEmpty(series.title) || !nonEmpty(series.source_url) || !romeDate(series.starts_at)) {
      fail("Az eseménysorozat rekord hiányos.");
    }
  }
  return document.series;
}

export function validateEventResearchJob(job, series) {
  if (!isRecord(job) || !nonEmpty(job.seriesKey) || !/^\d{4}-\d{2}-\d{2}$/.test(job.targetDate)) fail("Az Event ResearchJob érvénytelen.");
  const selected = series.find((item) => item.id === job.seriesKey);
  if (!selected) fail("Az Event ResearchJob ismeretlen eseménysorozatra hivatkozik.");
  const start = romeDate(selected.starts_at);
  const end = selected.ends_at ? romeDate(selected.ends_at) : start;
  if (!start || !end || job.targetDate < start || job.targetDate > end) fail("A cél nap nem esik az eseménysorozat időtartamába.");
  return { ...job, series: selected };
}

export function validateEventProposal(proposal, series) {
  if (!isRecord(proposal) || proposal.proposalVersion !== "1.0" || !nonEmpty(proposal.createdAt) || !isRecord(proposal.researchJob)) fail("Az Event javaslat fejléce érvénytelen.");
  const job = validateEventResearchJob(proposal.researchJob, series);
  if (!isRecord(proposal.candidate) || !nonEmpty(proposal.candidate.id) || !ACTIONS.has(proposal.candidate.action) || !STATUSES.has(proposal.candidate.status)) fail("Az Event javaslat jelöltje érvénytelen.");
  if (!Array.isArray(proposal.sourceCatalog) || proposal.sourceCatalog.length > 4) fail("Az Event javaslat forráslistája érvénytelen.");
  const sourceIds = new Set();
  const sourceUrls = new Set();
  const allowedDomain = new URL(job.series.source_url).hostname.replace(/^www\./, "");
  for (const source of proposal.sourceCatalog) {
    if (!isRecord(source) || !nonEmpty(source.id) || !nonEmpty(source.url) || !nonEmpty(source.checkedAt)) fail("Az Event javaslat forrása hiányos.");
    const url = new URL(source.url);
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") !== allowedDomain) fail("Az Event javaslat forrása nem hivatalos, engedélyezett domain.");
    if (sourceIds.has(source.id) || sourceUrls.has(url.href)) fail("Duplikált Event javaslat forrás.");
    sourceIds.add(source.id);
    sourceUrls.add(url.href);
  }
  if (proposal.candidate.action === "hold") return proposal;
  const event = proposal.candidate.event;
  if (!isRecord(event) || !nonEmpty(event.id) || !nonEmpty(event.title) || !nonEmpty(event.starts_at) || !nonEmpty(event.ends_at) || !nonEmpty(event.source_url)) fail("A konkrét Event jelölt hiányos.");
  if (event.series_id !== job.seriesKey || romeDate(event.starts_at) !== job.targetDate || romeDate(event.ends_at) !== job.targetDate) fail("A konkrét Event jelölt nem a kért napra esik.");
  if (new Date(event.ends_at).getTime() <= new Date(event.starts_at).getTime()) fail("A konkrét Event jelölt időtartama érvénytelen.");
  if (event.place_slug !== null) fail("A Research Agent nem találhat ki place_slug értéket.");
  if (!Array.isArray(proposal.candidate.sourceRefs) || proposal.candidate.sourceRefs.length === 0 || proposal.candidate.sourceRefs.some((id) => !sourceIds.has(id))) fail("A konkrét Event jelölt nem hivatkozik ellenőrzött forrásra.");
  return proposal;
}

export async function loadCanonicalEvents(root = process.cwd()) {
  return JSON.parse(await readFile(path.join(root, "knowledge", "events", "events.json"), "utf8"));
}
