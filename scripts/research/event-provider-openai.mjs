import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEventSeries, validateEventProposal, validateEventResearchJob } from "./event-core.mjs";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 45_000;

function fail(message) { throw new Error(message); }
function nonEmpty(value) { return typeof value === "string" && value.trim() !== ""; }

function responseText(response) {
  if (nonEmpty(response.output_text)) return response.output_text;
  for (const item of response.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && nonEmpty(content.text)) return content.text;
  fail("Az AI kutatás nem adott feldolgozható szöveget.");
}

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) fail("Az AI kutatás nem JSON javaslatot adott.");
  try { return JSON.parse(cleaned.slice(start, end + 1)); }
  catch { fail("Az AI javaslat JSON-ja érvénytelen."); }
}

function sourcesFrom(response) {
  const urls = new Map();
  const add = (url, title) => {
    if (!nonEmpty(url)) return;
    try { const parsed = new URL(url); if (/^https?:$/.test(parsed.protocol)) urls.set(parsed.href, { url: parsed.href, title: nonEmpty(title) ? title : parsed.hostname }); } catch { /* Invalid model URL is never evidence. */ }
  };
  for (const item of response.output ?? []) {
    for (const source of item.action?.sources ?? []) add(source.url, source.title);
    for (const content of item.content ?? []) for (const annotation of content.annotations ?? []) {
      const citation = annotation.url_citation ?? annotation;
      if (citation?.url) add(citation.url, citation.title);
    }
  }
  return [...urls.values()].slice(0, 4);
}

function prompt(job) {
  const series = job.series;
  return `You are a constrained research agent for a private family travel app. Search ONLY the official organizer domain for one concrete daily occurrence in an event series. This is a review proposal, never an automatic database write. Do not infer facts. If the official source does not explicitly establish a concrete program title, start time and end time for the requested day, return a HOLD proposal. Do not use an all-day festival period as a daily occurrence. Do not invent a venue, place_slug, price, admission, address, or duration. The event place_slug must always be null.

Return JSON only in exactly one of these shapes:
{
  "candidate": {
    "id": "stable-short-id",
    "action": "add",
    "status": "ready_for_approval|needs_review",
    "sourceUrls": ["official provider URL used"],
    "event": {
      "id": "event_lowercase_stable_key",
      "series_id": "${series.id}",
      "title": "official concrete program title",
      "starts_at": "2026-09-02T20:30:00+02:00",
      "ends_at": "2026-09-02T22:00:00+02:00",
      "source_url": "official source URL used",
      "organizer": null,
      "place_slug": null,
      "status": "confirmed"
    }
  }
}
OR
{
  "candidate": { "id": "no-confirmed-occurrence", "action": "hold", "status": "hold", "reason": "why the official source is insufficient" }
}

Requested date: ${job.targetDate}
Event series: ${JSON.stringify({ id: series.id, title: series.title, starts_at: series.starts_at, ends_at: series.ends_at, official_source: series.source_url })}`;
}

function proposalFromResponse({ modelOutput, providerSources, job, checkedAt }) {
  const sourceCatalog = providerSources.map((source, index) => ({ id: `src_${String(index + 1).padStart(2, "0")}`, url: source.url, title: source.title, checkedAt }));
  const byUrl = new Map(sourceCatalog.map((source) => [source.url, source.id]));
  const candidate = modelOutput?.candidate;
  if (!candidate || typeof candidate !== "object") fail("Az AI válaszból hiányzik az Event jelölt.");
  const normalized = structuredClone(candidate);
  if (normalized.action === "add") {
    const providedUrls = Array.isArray(normalized.sourceUrls) ? normalized.sourceUrls : [];
    delete normalized.sourceUrls;
    if (!Array.isArray(normalized.sourceRefs) || normalized.sourceRefs.length === 0) normalized.sourceRefs = providedUrls.map((url) => byUrl.get(url)).filter(Boolean);
    if (normalized.event?.source_url && !byUrl.has(normalized.event.source_url)) fail("Az AI olyan Event-forrást adott, amelyet a provider nem igazolt.");
    if (normalized.event?.source_url) normalized.sourceRefs = [...new Set([...(normalized.sourceRefs ?? []), byUrl.get(normalized.event.source_url)])];
  }
  const proposal = { proposalVersion: "1.0", createdAt: checkedAt, researchJob: { seriesKey: job.seriesKey, targetDate: job.targetDate }, candidate: normalized, sourceCatalog };
  return proposal;
}

export async function createLiveEventProposal({ job, root = process.cwd(), apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini", fetchImpl = fetch } = {}) {
  if (!nonEmpty(apiKey)) fail("Hiányzik a szerveroldali OPENAI_API_KEY.");
  const series = await loadEventSeries(root);
  const scopedJob = validateEventResearchJob(job, series);
  const domain = new URL(scopedJob.series.source_url).hostname.replace(/^www\./, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let response;
    try {
      response = await fetchImpl(RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          store: false,
          tool_choice: "required",
          tools: [{ type: "web_search", filters: { allowed_domains: [domain] } }],
          include: ["web_search_call.action.sources"],
          input: prompt(scopedJob),
        }),
      });
    } catch (error) {
      if (error?.name === "AbortError") fail("Az OpenAI Event kutatás időtúllépés miatt megszakadt. Próbáld újra később.");
      fail("Az OpenAI Event kutatás nem érte el az API-t. Ellenőrizd a hálózati/DNS-kapcsolatot, majd próbáld újra.");
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) fail(`Az OpenAI Event kutatás hibát adott (${response.status}).`);
    const providerSources = sourcesFrom(body);
    const proposal = proposalFromResponse({ modelOutput: parseJson(responseText(body)), providerSources, job: scopedJob, checkedAt: new Date().toISOString() });
    validateEventProposal(proposal, series);
    return { proposal, provider: { model, sourceCount: providerSources.length, responseId: body.id ?? null } };
  } finally { clearTimeout(timer); }
}

export async function saveEventProposal({ proposal, outputPath, root = process.cwd() }) {
  const absolute = path.resolve(root, outputPath);
  const proposalsRoot = path.resolve(root, "research", "proposals", "events") + path.sep;
  if (!absolute.startsWith(proposalsRoot)) fail("Az Event javaslat csak a research/proposals/events könyvtárba írható.");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(proposal, null, 2)}\n`);
  return path.relative(root, absolute);
}
