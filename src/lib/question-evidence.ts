/**
 * The Question UI must not decide whether an answer is useful by inspecting
 * its prose. These small, serialisable types describe what the deterministic
 * resolver knows, and exactly which fact gap may be worth researching.
 */
export type AnswerSufficiency = "complete" | "partial" | "insufficient";

export type AnswerRequirement = {
  factType: string;
  description: string;
  scope: "selected_day" | "trip" | "global";
};

export type QuestionAssessment = {
  sufficiency: AnswerSufficiency;
  answeredRequirements: AnswerRequirement[];
  missingRequirements: AnswerRequirement[];
  researchableRequirements: AnswerRequirement[];
};

export type QuestionEvidence = {
  id: string;
  source: "timeline" | "place" | "event" | "weather" | "shopping" | "mobility" | "trip-base";
  entity?: { type: string; id: string; name: string };
  factType: string;
  value?: string;
  status: "answerable" | "candidate_only" | "unknown";
  verification: "verified" | "partial" | "unknown";
  scope: "selected_day" | "trip" | "global";
  relevance: number;
};

export function completeAssessment(...answeredRequirements: AnswerRequirement[]): QuestionAssessment {
  return { sufficiency: "complete", answeredRequirements, missingRequirements: [], researchableRequirements: [] };
}

export function incompleteAssessment(
  sufficiency: "partial" | "insufficient",
  missingRequirements: AnswerRequirement[],
  answeredRequirements: AnswerRequirement[] = [],
): QuestionAssessment {
  return {
    sufficiency,
    answeredRequirements,
    missingRequirements,
    researchableRequirements: missingRequirements,
  };
}

export function canResearch(assessment: QuestionAssessment) {
  return assessment.sufficiency !== "complete" && assessment.researchableRequirements.length > 0;
}
