import "server-only";

import type { GroundedQuestionContext } from "./grounded-answer-contract";
import {
  parseResearchedQuestionAnswer,
  type ResearchSource,
  type ResearchedQuestionAnswer,
} from "./researched-question-contract";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 30_000;
// Web search can require an internal reasoning/tool round before the short,
// structured user-facing answer. Keep the visible schema concise, but leave
// enough output budget for that work so the response is not cut off early.
const MAX_OUTPUT_TOKENS = 2_400;

type ProviderResponse = {
  output_text?: unknown;
  output?: Array<{
    type?: string;
    action?: { sources?: Array<{ url?: unknown; title?: unknown }> };
    content?: Array<{ type?: string; text?: unknown; annotations?: Array<{ type?: string; url_citation?: { url?: unknown; title?: unknown } }> }>;
  }>;
};

function responseText(body: ProviderResponse) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  }
  throw new Error("A kutatás nem adott feldolgozható választ.");
}

function addSource(target: Map<string, ResearchSource>, value: unknown, title: unknown) {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    if (!target.has(url.href)) target.set(url.href, { url: url.href, title: typeof title === "string" && title.trim() ? title.trim() : url.hostname });
  } catch { /* An invalid provider URL cannot become evidence. */ }
}

function providerSources(response: ProviderResponse): ResearchSource[] {
  const sources = new Map<string, ResearchSource>();
  for (const item of response.output ?? []) {
    if (item.type === "web_search_call") for (const source of item.action?.sources ?? []) addSource(sources, source.url, source.title);
    for (const content of item.content ?? []) for (const annotation of content.annotations ?? []) {
      if (annotation.type === "url_citation") addSource(sources, annotation.url_citation?.url, annotation.url_citation?.title);
    }
  }
  return [...sources.values()];
}

function researchInput(question: string, context: GroundedQuestionContext) {
  return JSON.stringify({
    question,
    selectedDay: {
      date: context.date,
      title: context.dayTitle,
      activities: context.activities.map(({ time, title, locationName }) => ({ time, title, locationName })),
      events: context.events.map(({ title, startsAt, endsAt, status }) => ({ title, startsAt, endsAt, status })),
    },
    nowInRome: new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date()).replace(" ", "T"),
  });
}

/**
 * On-demand research is intentionally a read-only enhancement after the
 * deterministic Timeline/Place resolver. It never changes canonical Places,
 * never receives the private accommodation address, and its citations must
 * originate in this exact web-search response.
 */
export async function answerResearchedQuestion(question: string, context: GroundedQuestionContext): Promise<ResearchedQuestionAnswer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Az AI kutatás nincs konfigurálva.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_QUESTION_RESEARCH_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        tool_choice: "required",
        tools: [{ type: "web_search", search_context_size: "medium", user_location: { type: "approximate", country: "IT", city: "Villasimius", timezone: "Europe/Rome" } }],
        include: ["web_search_call.action.sources"],
        text: { verbosity: "low", format: { type: "json_schema", name: "researched_trip_answer", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["status", "title", "body", "sourceUrls"],
          properties: {
            status: { type: "string", enum: ["answered", "insufficient_evidence"] },
            title: { type: "string", maxLength: 90 },
            body: { type: "string", maxLength: 600 },
            sourceUrls: { type: "array", maxItems: 4, items: { type: "string" } },
          },
        } } },
        input: [
          {
            role: "system",
            content: "You are the read-only web research layer of Utazási, a private family travel companion. Answer in Hungarian. Use web search and return only the required JSON. First respect the supplied selected-day Timeline; it is private schedule context, not a web source. Then research the user's missing travel fact. Never invent a departure time, travel duration, price, stock, opening status, event, route, or availability. A named product or brand (for example Marduk beer) may be claimed available only if a business-specific web source explicitly supports it. If no such source exists, say so plainly; you may separately mention a venue only if its own source verifies the relevant general profile. For a 'belefér?' question, use an explicit Timeline time window and sourced opening-hours facts, but do not estimate travel duration when no verified route is supplied. For future selected dates, do not describe a business as currently open or closed. Each factual answer must cite 1–4 exact URLs returned by your web search in sourceUrls. If the evidence is insufficient, return status insufficient_evidence and empty title, body and sourceUrls. Never expose or request a private accommodation address.",
          },
          { role: "user", content: researchInput(question, context) },
        ],
      }),
    });
    const body = await response.json().catch(() => ({})) as ProviderResponse & { error?: { message?: unknown } };
    if (!response.ok) throw new Error(`Az AI kutatás most nem érhető el (${response.status}).`);
    return parseResearchedQuestionAnswer(responseText(body), providerSources(body));
  } finally {
    clearTimeout(timer);
  }
}
