export type ResearchSource = { url: string; title: string };

export type ResearchedQuestionAnswer = {
  title: string;
  body: string;
  sources: ResearchSource[];
};

type ModelAnswer = {
  status?: unknown;
  title?: unknown;
  body?: unknown;
  sourceUrls?: unknown;
};

export class ResearchedQuestionContractError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function cleanedJson(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

/**
 * Web research is useful only when the displayed facts remain traceable to
 * sources returned by the provider. The model never gets to invent a link or
 * return a prose answer without at least one checked source.
 */
export function parseResearchedQuestionAnswer(value: string, providerSources: readonly ResearchSource[]): ResearchedQuestionAnswer | null {
  let parsed: ModelAnswer;
  try {
    parsed = JSON.parse(cleanedJson(value)) as ModelAnswer;
  } catch {
    throw new ResearchedQuestionContractError("A kutatási válasz formátuma nem használható.");
  }

  const status = parsed.status === "answered" ? "answered" : parsed.status === "insufficient_evidence" ? "insufficient_evidence" : null;
  if (!status) throw new ResearchedQuestionContractError("A kutatás nem adott értelmezhető állapotot.");
  if (status === "insufficient_evidence") return null;

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  const requestedUrls = Array.isArray(parsed.sourceUrls) && parsed.sourceUrls.every((item) => typeof item === "string")
    ? [...new Set(parsed.sourceUrls)]
    : [];
  const sourceByUrl = new Map(providerSources.map((source) => [source.url, source]));
  const sources = requestedUrls.map((url) => sourceByUrl.get(url)).filter((source): source is ResearchSource => Boolean(source));

  if (!title || title.length > 90 || !body || body.length > 700 || !requestedUrls.length || sources.length !== requestedUrls.length || sources.length > 4) {
    throw new ResearchedQuestionContractError("A kutatási válasz nem kapcsolható ellenőrzött forrásokhoz.");
  }
  return { title, body, sources };
}
