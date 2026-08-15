import "server-only";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 20_000;
const MAX_CONTEXT_BYTES = 16_000;
const MAX_OUTPUT_TOKENS = 280;

export type GroundedQuestionContext = {
  date: string;
  dayTitle: string;
  activities: Array<{ id: string; time: string; title: string; locationName: string | null; placeSlug: string | null }>;
  events: Array<{ id: string; title: string; startsAt: string; endsAt: string | null; status: "scheduled" | "changed" | "cancelled"; placeSlug: string | null }>;
  places: Array<{ slug: string; name: string; type: string; locality: string | null; verifiedNote: string | null }>;
};

export type GroundedQuestionAnswer = { title: string; body: string; factIds: string[] };

function responseText(body: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("Az AI nem adott feldolgozható választ.");
}

function parseAnswer(value: string, context: GroundedQuestionContext): GroundedQuestionAnswer {
  const parsed = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as Partial<GroundedQuestionAnswer>;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const factIds = Array.isArray(parsed.factIds) && parsed.factIds.every((id) => typeof id === "string") ? [...new Set(parsed.factIds)] : [];
  const allowed = new Set([
    ...context.activities.map((activity) => `timeline:${activity.id}`),
    ...context.events.map((event) => `event:${event.id}`),
    ...context.places.map((place) => `place:${place.slug}`),
  ]);
  if (!title || title.length > 90 || !body || body.length > 700 || !factIds.length || factIds.some((id) => !allowed.has(id))) {
    throw new Error("Az AI válasza nem kapcsolható kizárólag az ellenőrzött adatokhoz.");
  }
  return { title, body, factIds };
}

/**
 * AI may only express the compact context passed here. It has no web tools,
 * no database tools and a response is rejected unless every cited fact is an
 * existing Timeline, Event or Place identifier.
 */
export async function answerGroundedQuestion(question: string, context: GroundedQuestionContext): Promise<GroundedQuestionAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Az AI segítség nincs konfigurálva.");
  const groundedInput = JSON.stringify({ question, context });
  if (Buffer.byteLength(groundedInput, "utf8") > MAX_CONTEXT_BYTES) {
    throw new Error("A kérdéshez tartozó ellenőrzött kontextus most túl nagy az AI-összefoglalóhoz.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_QUESTION_MODEL ?? process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5-mini",
        store: false,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        text: { format: { type: "json_schema", name: "grounded_trip_answer", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["title", "body", "factIds"],
          properties: { title: { type: "string" }, body: { type: "string" }, factIds: { type: "array", minItems: 1, items: { type: "string" } } },
        } } },
        input: [
          { role: "system", content: "You are Utazási, a private family travel companion. Answer in Hungarian. Use ONLY the supplied JSON context. Do not infer or invent opening hours, prices, tickets, routes, travel times, weather, availability, or event details. If the context cannot answer, say that clearly. Cite every factual statement with the exact factIds supplied in context. Return concise JSON only." },
          { role: "user", content: groundedInput },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Az AI válasz most nem érhető el (${response.status}).`);
    return parseAnswer(responseText(body), context);
  } finally { clearTimeout(timer); }
}
