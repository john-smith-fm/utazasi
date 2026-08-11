import "server-only";

import eventSeriesDocument from "../../knowledge/events/event-series.json";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 30_000;

type EventSeries = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  source_url: string;
};

type Source = { url: string; title: string };

export type EventResearchProposal = {
  kind: "ready_for_review" | "hold";
  message: string;
  sources: Source[];
  event?: { id: string; seriesId: string; title: string; startsAt: string; endsAt: string; sourceUrl: string };
};

function asRomeDate(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function selectedSeries(seriesKey: string, targetDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error("Érvénytelen cél-nap.");
  const series = (eventSeriesDocument.series as EventSeries[]).find((item) => item.id === seriesKey);
  if (!series) throw new Error("Ismeretlen eseménysorozat.");
  const start = asRomeDate(series.starts_at);
  const end = series.ends_at ? asRomeDate(series.ends_at) : start;
  if (targetDate < start || targetDate > end) throw new Error("A cél-nap nem esik az eseménysorozat időszakába.");
  return series;
}

function responseText(body: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("A kutatás nem adott feldolgozható választ.");
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function officialSources(body: { output?: Array<{ action?: { sources?: Array<{ url?: unknown; title?: unknown }> }; content?: Array<{ annotations?: Array<{ url_citation?: { url?: unknown; title?: unknown } }> }> }> }, allowedDomain: string): Source[] {
  const unique = new Map<string, Source>();
  const add = (url: unknown, title: unknown) => {
    if (typeof url !== "string") return;
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol) || parsed.hostname.replace(/^www\./, "") !== allowedDomain) return;
      unique.set(parsed.href, { url: parsed.href, title: typeof title === "string" && title.trim() ? title : parsed.hostname });
    } catch { /* Provider metadata remains untrusted until it passes this check. */ }
  };
  for (const item of body.output ?? []) {
    for (const source of item.action?.sources ?? []) add(source.url, source.title);
    for (const content of item.content ?? []) for (const annotation of content.annotations ?? []) add(annotation.url_citation?.url, annotation.url_citation?.title);
  }
  return [...unique.values()].slice(0, 4);
}

function candidateFromResponse(value: unknown, series: EventSeries, targetDate: string, sources: Source[]): EventResearchProposal {
  if (!value || typeof value !== "object") throw new Error("A kutatás érvénytelen választ adott.");
  const candidate = value as { action?: unknown; reason?: unknown; event?: Record<string, unknown> };
  if (candidate.action === "hold") return { kind: "hold", message: typeof candidate.reason === "string" && candidate.reason.trim() ? candidate.reason : "A hivatalos forrásból nem igazolható konkrét napi program.", sources };
  if (candidate.action !== "add" || !candidate.event) throw new Error("A kutatás nem adott érvényes javaslatot.");
  const event = candidate.event;
  const title = typeof event.title === "string" ? event.title.trim() : "";
  const startsAt = typeof event.starts_at === "string" ? event.starts_at : "";
  const endsAt = typeof event.ends_at === "string" ? event.ends_at : "";
  const sourceUrl = typeof event.source_url === "string" ? event.source_url : "";
  if (!title || Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt)) || new Date(endsAt) <= new Date(startsAt)) throw new Error("A javasolt esemény ideje hiányos vagy érvénytelen.");
  if (asRomeDate(startsAt) !== targetDate || asRomeDate(endsAt) !== targetDate) throw new Error("A javaslat nem a kiválasztott napra esik.");
  if (!sources.some((source) => source.url === sourceUrl)) throw new Error("A javasolt eseményhez nincs ellenőrzött hivatalos forrás.");
  return {
    kind: "ready_for_review",
    message: "Konkrét napi programjavaslat készült. A felvételhez még emberi jóváhagyás szükséges.",
    sources,
    event: { id: `event_${series.id.replace(/^event_/, "")}_${targetDate.replaceAll("-", "")}`, seriesId: series.id, title, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), sourceUrl },
  };
}

/** One bounded official-source lookup. It only returns a review proposal. */
export async function researchDailyEventProposal(input: { seriesKey: string; targetDate: string }): Promise<EventResearchProposal> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Az AI kutatás nincs konfigurálva.");
  const series = selectedSeries(input.seriesKey, input.targetDate);
  const domain = new URL(series.source_url).hostname.replace(/^www\./, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        tool_choice: "required",
        tools: [{ type: "web_search", filters: { allowed_domains: [domain] } }],
        include: ["web_search_call.action.sources"],
        input: `You are a constrained research agent for a private family travel app. Search ONLY ${domain}. Find one concrete daily occurrence for ${series.title} on ${input.targetDate}. This is a review proposal only; never infer facts. An all-day festival period is not a daily program. If the official source does not explicitly prove a title, start time and end time for this date, return exactly {"action":"hold","reason":"..."}. Otherwise return exactly {"action":"add","event":{"title":"...","starts_at":"ISO timestamp in Europe/Rome","ends_at":"ISO timestamp in Europe/Rome","source_url":"one exact official search source URL"}}. Return JSON only.`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Az AI kutatás nem érhető el (${response.status}).`);
    return candidateFromResponse(parseJson(responseText(body)), series, input.targetDate, officialSources(body, domain));
  } finally { clearTimeout(timer); }
}
