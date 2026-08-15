export type GroundedQuestionContext = {
  date: string;
  dayTitle: string;
  activities: Array<{ id: string; time: string; title: string; locationName: string | null; placeSlug: string | null }>;
  events: Array<{ id: string; title: string; startsAt: string; endsAt: string | null; status: "scheduled" | "changed" | "cancelled"; placeSlug: string | null }>;
  places: Array<{ slug: string; name: string; type: string; locality: string | null; verifiedNote: string | null }>;
};

export type GroundedQuestionAnswer = { title: string; body: string; factIds: string[] };

type ModelAnswer = Partial<GroundedQuestionAnswer> & { status?: unknown };

export class GroundedAnswerContractError extends Error {
  readonly code: "invalid_json" | "invalid_answer" | "unknown_fact_id" | "invalid_insufficient_context";
  readonly diagnostics: Record<string, number | boolean>;

  constructor(
    message: string,
    code: "invalid_json" | "invalid_answer" | "unknown_fact_id" | "invalid_insufficient_context",
    diagnostics: Record<string, number | boolean>,
  ) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

/** These are the only citations an AI answer may use for this request. */
export function allowedGroundedFactIds(context: GroundedQuestionContext) {
  return [
    ...context.activities.map((activity) => `timeline:${activity.id}`),
    ...context.events.map((event) => `event:${event.id}`),
    ...context.places.map((place) => `place:${place.slug}`),
  ];
}

/**
 * A completed answer must cite supplied facts. An explicit
 * `insufficient_context` response is also valid, but its model-written text
 * is deliberately discarded: callers keep their deterministic fallback.
 */
export function parseGroundedAnswer(value: string, context: GroundedQuestionContext): GroundedQuestionAnswer | null {
  let parsed: ModelAnswer;
  try {
    parsed = JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as ModelAnswer;
  } catch {
    throw new GroundedAnswerContractError("Az AI válasza most nem használható. Próbáld újra.", "invalid_json", {});
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const factIds = Array.isArray(parsed.factIds) && parsed.factIds.every((id) => typeof id === "string") ? [...new Set(parsed.factIds)] : [];
  const status = parsed.status === "insufficient_context" ? "insufficient_context" : parsed.status === "grounded" ? "grounded" : null;
  const diagnostics = {
    hasStatus: Boolean(status),
    hasTitle: Boolean(title),
    titleLength: title.length,
    hasBody: Boolean(body),
    bodyLength: body.length,
    factIdCount: factIds.length,
    allowedFactIdCount: allowedGroundedFactIds(context).length,
  };

  if (status === "insufficient_context") {
    if (title || body || factIds.length) {
      throw new GroundedAnswerContractError("Az AI válasza nem kapcsolható kizárólag az ellenőrzött adatokhoz.", "invalid_insufficient_context", diagnostics);
    }
    return null;
  }

  const allowed = new Set(allowedGroundedFactIds(context));
  const invalidFactIdCount = factIds.filter((id) => !allowed.has(id)).length;
  if (status !== "grounded" || !title || title.length > 90 || !body || body.length > 700 || !factIds.length) {
    throw new GroundedAnswerContractError("Az AI válasza nem kapcsolható kizárólag az ellenőrzött adatokhoz.", "invalid_answer", diagnostics);
  }
  if (invalidFactIdCount) {
    throw new GroundedAnswerContractError("Az AI válasza nem kapcsolható kizárólag az ellenőrzött adatokhoz.", "unknown_fact_id", { ...diagnostics, invalidFactIdCount });
  }
  return { title, body, factIds };
}
