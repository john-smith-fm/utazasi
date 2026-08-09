import "server-only";

import type { ObservedEventState } from "@/lib/event-watch-service";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 30_000;

type WatchInput = { title: string; sourceUrl: string; startsAt: string; status: ObservedEventState["status"]; placeSlug: string | null };

function sourceDomain(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Az esemény forrása nem használható.");
  return url.hostname.replace(/^www\./, "");
}

function responseText(response: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("A kutatás nem adott feldolgozható választ.");
}

function parseObservation(text: string): ObservedEventState {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as Partial<ObservedEventState>;
  const status = parsed?.status;
  if (!parsed || !status || !["scheduled", "changed", "cancelled"].includes(status)) throw new Error("A kutatás érvénytelen eseményállapotot adott.");
  if (typeof parsed.startsAt !== "string" || Number.isNaN(Date.parse(parsed.startsAt))) throw new Error("A kutatás nem adott érvényes eseményidőt.");
  const placeSlug = parsed.placeSlug;
  if (placeSlug !== null && typeof placeSlug !== "string") throw new Error("A kutatás érvénytelen helyszínt adott.");
  return { status, startsAt: new Date(parsed.startsAt).toISOString(), placeSlug };
}

/**
 * One bounded Responses API request. Search results are restricted to the
 * approved Event source domain; no arbitrary URL supplied by a user is fetched.
 */
export async function researchEventState(input: WatchInput): Promise<ObservedEventState> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("A Watch kutatás nincs konfigurálva.");
  const domain = sourceDomain(input.sourceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_WATCH_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        tool_choice: "required",
        tools: [{ type: "web_search", filters: { allowed_domains: [domain] } }],
        include: ["web_search_call.action.sources"],
        input: `Check only the approved official event source domain ${domain} for this event. Do not infer missing facts. Return JSON only, with exactly status, startsAt and placeSlug. status must be scheduled, changed or cancelled. startsAt must be an ISO timestamp; if the official source gives local time, use Europe/Rome. placeSlug must be null unless it exactly matches the already known value.\n\nEvent: ${input.title}\nApproved source: ${input.sourceUrl}\nKnown baseline: ${JSON.stringify({ status: input.status, startsAt: input.startsAt, placeSlug: input.placeSlug })}`,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`A Watch kutatás nem érhető el (${response.status}).`);
    return parseObservation(responseText(body));
  } finally {
    clearTimeout(timer);
  }
}
