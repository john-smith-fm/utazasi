import "server-only";

import { parseTimelineProposalResearch, timelineProposalProviderSources, timelineProposalResponseText, type TimelineProposalProviderResponse } from "@/lib/timeline-proposal-contract";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 55_000;
const MAX_OUTPUT_TOKENS = 5_000;

export type TimelineProposalResearchContext = {
  request: string;
  trip: { destination: string; timezone: string };
  sourceDay: { date: string; title: string; activities: Array<{ id: string; startTime: string; durationMinutes: number; title: string; locationName: string; description: string }> };
  targetDays: Array<{ date: string; title: string; version: number; activities: Array<{ id: string; startTime: string; durationMinutes: number; title: string; locationName: string; description: string }> }>;
};

export async function researchTimelineProposal(context: TimelineProposalResearchContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Az AI Planner nincs konfigurálva.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_TIMELINE_PLANNER_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        tool_choice: "required",
        tools: [{ type: "web_search", search_context_size: "medium" }],
        include: ["web_search_call.action.sources"],
        text: { verbosity: "low", format: { type: "json_schema", name: "timeline_proposal", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["status", "summary", "limitations", "days"],
          properties: {
            status: { type: "string", enum: ["proposed", "insufficient_evidence"] },
            summary: { type: "string", maxLength: 500 },
            limitations: { type: "array", maxItems: 5, items: { type: "string", maxLength: 300 } },
            days: { type: "array", maxItems: 14, items: { type: "object", additionalProperties: false, required: ["date", "keepActivityIds", "removeActivityIds", "items"], properties: {
              date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
              keepActivityIds: { type: "array", items: { type: "string" } },
              removeActivityIds: { type: "array", items: { type: "string" } },
              items: { type: "array", maxItems: 10, items: { type: "object", additionalProperties: false, required: ["startTime", "durationMinutes", "title", "locationName", "description", "rationale", "confidence", "sourceUrls"], properties: {
              startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" },
              durationMinutes: { type: "integer", minimum: 1, maximum: 720 },
              title: { type: "string", maxLength: 120 },
              locationName: { type: "string", maxLength: 160 },
              description: { type: "string", maxLength: 1000 },
              rationale: { type: "string", maxLength: 300 },
              confidence: { type: "string", enum: ["verified", "likely", "unverified"] },
              sourceUrls: { type: "array", maxItems: 4, items: { type: "string" } },
            } } },
            } } },
          },
        } } },
        input: [
          { role: "system", content: "You are the search-first Timeline Planner of a private Hungarian family travel companion. Return Hungarian JSON only. Produce one day diff for every supplied targetDays entry, using its exact date. Every existing activity id must occur exactly once in either keepActivityIds or removeActivityIds. Additive requests keep all existing activities. A move or replacement removes the old id and adds its replacement item. Infer useful rhythm and preserve explicit meals, rest and child naps unless the user asks otherwise. Use web search for concrete venues at the supplied destination and dates. Do not invent travel times, opening hours, availability, events, prices or addresses. A concrete locationName requires 1-4 exact supporting URLs returned by this search call. Use verified only when the source directly supports the relevant fact; likely for a sourced venue with uncertain date-specific detail; unverified only for structure-only items with empty locationName and sourceUrls. If adequate evidence cannot support a useful mutation, return insufficient_evidence with empty days. Never include or request a private accommodation address." },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
    const body = await response.json().catch(() => ({})) as TimelineProposalProviderResponse;
    if (!response.ok) throw new Error(`Az AI Planner most nem érhető el (${response.status}).`);
    return parseTimelineProposalResearch(timelineProposalResponseText(body), timelineProposalProviderSources(body), context.targetDays);
  } finally { clearTimeout(timer); }
}
