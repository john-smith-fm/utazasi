import "server-only";
import {
  allowedGroundedFactIds,
  GroundedAnswerContractError,
  parseGroundedAnswer,
  type GroundedQuestionAnswer,
  type GroundedQuestionContext,
} from "./grounded-answer-contract";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 20_000;
const MAX_CONTEXT_BYTES = 16_000;
// GPT-5 mini can spend part of this allowance on bounded reasoning before
// emitting the strict JSON response. The answer contract below stays small,
// while this leaves enough room for the JSON object to be completed.
const MAX_OUTPUT_TOKENS = 1_400;

export type { GroundedQuestionAnswer, GroundedQuestionContext } from "./grounded-answer-contract";

function responseText(body: { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }> }) {
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && typeof content.text === "string") return content.text;
  throw new Error("Az AI nem adott feldolgozható választ.");
}

type ResponseDiagnostics = {
  status?: unknown;
  incomplete_details?: { reason?: unknown };
  output?: Array<{ type?: unknown; content?: Array<{ type?: unknown }> }>;
};

function reportRejectedModelOutput(body: ResponseDiagnostics, error: unknown) {
  // Keep production diagnostics useful without logging the family question,
  // private trip context or the model's raw response.
  console.warn("[grounded-questioning] Rejected model output", {
    reason: error instanceof Error ? error.message : "unknown",
    responseStatus: typeof body.status === "string" ? body.status : null,
    incompleteReason: typeof body.incomplete_details?.reason === "string" ? body.incomplete_details.reason : null,
    outputTypes: body.output?.map((item) => (typeof item.type === "string" ? item.type : "unknown")) ?? [],
    validation: error instanceof GroundedAnswerContractError ? { code: error.code, ...error.diagnostics } : null,
  });
}

/**
 * AI may only express the compact context passed here. It has no web tools,
 * no database tools and a response is rejected unless every cited fact is an
 * existing Timeline, Event or Place identifier.
 */
export async function answerGroundedQuestion(question: string, context: GroundedQuestionContext): Promise<GroundedQuestionAnswer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Az AI segítség nincs konfigurálva.");
  // `timeline:` / `event:` / `place:` are implementation identifiers, not
  // derivable from the human-readable context. Supply them explicitly so a
  // valid structured response can cite a fact without guessing its prefix.
  const groundedInput = JSON.stringify({ question, context, allowedFactIds: allowedGroundedFactIds(context) });
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
        reasoning: { effort: "minimal" },
        text: { verbosity: "low", format: { type: "json_schema", name: "grounded_trip_answer", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["status", "title", "body", "factIds"],
          properties: {
            status: { type: "string", enum: ["grounded", "insufficient_context"] },
            title: { type: "string", maxLength: 70 },
            body: { type: "string", maxLength: 320 },
            factIds: { type: "array", maxItems: 3, items: { type: "string" } },
          },
        } } },
        input: [
          { role: "system", content: "You are Utazási, a private family travel companion. Answer in Hungarian. Use ONLY the supplied JSON context. Do not infer or invent opening hours, prices, tickets, routes, travel times, weather, availability, or event details. For a factual answer, return status 'grounded', keep the title under 70 characters and the body to at most two short sentences, and cite 1–3 identifiers copied exactly from allowedFactIds. If the supplied context cannot answer, return exactly status 'insufficient_context' with title '', body '', and factIds []. Return exactly one valid JSON object matching the supplied schema: no Markdown, no code fence, no text before or after it." },
          { role: "user", content: groundedInput },
        ],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Az AI válasz most nem érhető el (${response.status}).`);
    try {
      return parseGroundedAnswer(responseText(body), context);
    } catch (error) {
      reportRejectedModelOutput(body as ResponseDiagnostics, error);
      throw error;
    }
  } finally { clearTimeout(timer); }
}
