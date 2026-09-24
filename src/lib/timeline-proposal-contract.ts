import { randomUUID } from "node:crypto";
import type { ProposalConfidence, TimelineProposalItem, TimelineProposalSource } from "@/lib/timeline-proposal";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export type TimelineProposalProviderResponse = {
  output_text?: unknown;
  output?: Array<{
    type?: string;
    action?: { sources?: Array<{ url?: unknown; title?: unknown }> };
    content?: Array<{ type?: string; text?: unknown; annotations?: Array<{ type?: string; url_citation?: { url?: unknown; title?: unknown } }> }>;
  }>;
};

type ModelProposal = { status?: unknown; summary?: unknown; limitations?: unknown; items?: unknown };

export function timelineProposalResponseText(body: TimelineProposalProviderResponse) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) {
    if (content.type === "output_text" && typeof content.text === "string") return content.text;
  }
  throw new Error("A Planner nem adott feldolgozható választ.");
}

function addSource(target: Map<string, TimelineProposalSource>, value: unknown, title: unknown) {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    if (!target.has(url.href)) target.set(url.href, { url: url.href, title: typeof title === "string" && title.trim() ? title.trim() : url.hostname });
  } catch { /* Invalid provider URLs are never evidence. */ }
}

export function timelineProposalProviderSources(response: TimelineProposalProviderResponse) {
  const sources = new Map<string, TimelineProposalSource>();
  for (const item of response.output ?? []) {
    if (item.type === "web_search_call") for (const source of item.action?.sources ?? []) addSource(sources, source.url, source.title);
    for (const content of item.content ?? []) for (const annotation of content.annotations ?? []) {
      if (annotation.type === "url_citation") addSource(sources, annotation.url_citation?.url, annotation.url_citation?.title);
    }
  }
  return [...sources.values()];
}

function cleanJson(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

export function parseTimelineProposalResearch(value: string, providerSources: readonly TimelineProposalSource[]) {
  let parsed: ModelProposal;
  try { parsed = JSON.parse(cleanJson(value)) as ModelProposal; }
  catch { throw new Error("A Planner válaszformátuma nem használható."); }
  if (parsed.status === "insufficient_evidence") return null;
  if (parsed.status !== "proposed" || typeof parsed.summary !== "string" || !parsed.summary.trim() || !Array.isArray(parsed.items) || !Array.isArray(parsed.limitations)) {
    throw new Error("A Planner nem adott értelmezhető javaslatot.");
  }
  const sourceByUrl = new Map(providerSources.map((source) => [source.url, source]));
  const items: TimelineProposalItem[] = parsed.items.slice(0, 10).map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("A Planner hibás programpontot adott.");
    const item = raw as Record<string, unknown>;
    const startTime = typeof item.startTime === "string" ? item.startTime : "";
    const durationMinutes = Number(item.durationMinutes);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const locationName = typeof item.locationName === "string" ? item.locationName.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const rationale = typeof item.rationale === "string" ? item.rationale.trim() : "";
    const confidence: ProposalConfidence | null = item.confidence === "verified" || item.confidence === "likely" || item.confidence === "unverified" ? item.confidence : null;
    const requestedUrls = Array.isArray(item.sourceUrls) && item.sourceUrls.every((url) => typeof url === "string") ? [...new Set(item.sourceUrls as string[])] : [];
    const sources = requestedUrls.map((url) => sourceByUrl.get(url)).filter((source): source is TimelineProposalSource => Boolean(source));
    if (!TIME_PATTERN.test(startTime) || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720 || !title || title.length > 120 || locationName.length > 160 || description.length > 1000 || !rationale || rationale.length > 300 || !confidence || requestedUrls.length > 4 || sources.length !== requestedUrls.length) {
      throw new Error("A Planner egyik programpontja nem felel meg a szerződésnek.");
    }
    if (locationName && !sources.length) throw new Error("Konkrét hely csak ellenőrzött keresési forrással javasolható.");
    return { id: randomUUID(), activity: { title, startTime, durationMinutes, locationName, placeSlug: null, description }, rationale, confidence, sources };
  });
  if (!items.length) return null;
  const limitations = parsed.limitations.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 5).map((item) => item.trim().slice(0, 300));
  return { summary: parsed.summary.trim().slice(0, 500), items, limitations };
}
