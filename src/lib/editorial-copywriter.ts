import "server-only";
import { Buffer } from "node:buffer";
import { editorialFingerprint, parseEditorialCopy, type EditorialCopy, type EditorialCopyInput } from "./editorial-copy-contract";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 12_000;
const MAX_CONTEXT_BYTES = 8_000;
const MAX_OUTPUT_TOKENS = 360;

export const EDITORIAL_COPYWRITER_SYSTEM_PROMPT = `You are the editorial copywriter for Utazási, a private Hungarian family travel companion.

Return one compact Hungarian daily title and subtitle from the supplied JSON brief.

Your internal editorial process is deliberately two-step:
1. Read the privacy-safe tripEditorialSummary and identify ONE detail that makes this day distinct from the other trip days.
2. Write the title and subtitle about that difference. Do not output this reasoning.

Grounding rules:
- Use only the supplied brief. You do not have web, database, calendar, weather or route access.
- Never invent an opening hour, route, travel time, price, availability, weather detail, beach fact, event detail or program that is not in the brief.
- Mention a concrete place or event only if it appears in mainActivity, verifiedEvent or placeFacts.
- Place facilities and infrastructure are not an itinerary. Never turn a station, parking, accessibility feature, shop, restaurant or any other venue attribute into a planned transport mode, visit, stop or daily activity unless the brief explicitly identifies it as the main activity or verified event.
- If you make a concrete factual claim, copy its supporting item verbatim into grounding. Grounding may contain only strings supplied in the allowedGrounding array.
- The brief deliberately contains no sensory or qualitative travel facts unless stated explicitly. Do not add sunshine, waves, sea conditions, sand, scenery, distance, crowds, availability, "korai"/"késői" timing, or similar colour just to make the prose livelier.
- When the brief has no stated detail beyond the programme shape, keep the subtitle neutral and schedule-level: name the supported focus, then describe only its rhythm (for example, that the day is organised around it and remains flexible). This is preferable to an attractive but unsupported detail.

Editorial rules:
- title: Hungarian, 2–6 words, one line, no final punctuation, memorable but concrete. It is an editorial hook, not an activity label. Do not use “nap”, “pihenőnap” or “napritmus” merely as a label.
- subtitle: one natural, grounded sentence. Explain why the title fits this day; do not list the Timeline, enumerate activities or repeat the title.
- Beach alone is usually not an editorial difference. Prefer the place’s first/return/consecutive appearance, a contrast with adjacent days, a trip-arc moment, a verified event, or another supplied distinction.
- For a repeated place, never pretend it is new. The safe trip summary tells you whether it is a first visit, a return, or a consecutive return.
- Do not use emoji, bullets, headings, date labels, “ma”, “mai terv”, “napi program”, “programok száma”, or generic travel-ad copy.
- Avoid the title wording and opening phrase of recentEditorialCopy. Also vary the full 12-day series: do not make every title begin with a Place name or give every subtitle the same sentence frame. Do not force novelty with false detail.
- Keep Hungarian natural and consistently address the family in second-person plural where a personal verb is needed. Prefer a simple, precise sentence over literary filler.
- For an empty/open day, acknowledge flexible possibilities without making recommendations or factual promises.

Output exactly this JSON schema and no other text. The grounding array is internal evidence only, not UI copy.`;

function responseText(body: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("A napi szerkesztői szöveg nem érkezett meg.");
}

function allowedGrounding(input: EditorialCopyInput) {
  return [
    ...input.signals.map((signal) => `signal:${signal}`),
    ...(input.mainActivity?.placeName ? [input.mainActivity.placeName] : []),
    ...(input.verifiedEvent ? [input.verifiedEvent.title, ...(input.verifiedEvent.time ? [input.verifiedEvent.time] : [])] : []),
    ...input.placeFacts.flatMap((place) => [place.name, ...place.facts]),
  ];
}

export async function createEditorialCopy(input: EditorialCopyInput): Promise<{ copy: EditorialCopy; fingerprint: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("A napi szerkesztői szöveg nincs konfigurálva.");
  const userInput = JSON.stringify({ brief: input, allowedGrounding: allowedGrounding(input) });
  if (Buffer.byteLength(userInput, "utf8") > MAX_CONTEXT_BYTES) throw new Error("A napi szerkesztői kontextus túl nagy.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_EDITORIAL_MODEL ?? process.env.OPENAI_QUESTION_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        reasoning: { effort: "minimal" },
        text: { verbosity: "low", format: { type: "json_schema", name: "daily_editorial_copy", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["title", "subtitle", "grounding"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 62 },
            subtitle: { type: "string", minLength: 10, maxLength: 280 },
            grounding: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", maxLength: 180 } },
          },
        } } },
        input: [
          { role: "system", content: EDITORIAL_COPYWRITER_SYSTEM_PROMPT },
          { role: "user", content: userInput },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`A napi szerkesztői szöveg most nem elérhető (${response.status}).`);
    return { copy: parseEditorialCopy(responseText(body), input), fingerprint: editorialFingerprint(input) };
  } finally {
    clearTimeout(timer);
  }
}
