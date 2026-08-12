import type { PlaceType } from "@/types/places";

export type ResearchMode = "discover" | "enrich" | "verify";
export type ResearchCandidateAction = "add" | "update" | "no_change" | "hold";
export type ResearchCandidateStatus = "ready_for_approval" | "needs_review" | "hold";
export type ResearchSourceType = "official_business" | "municipality" | "government" | "tourism_authority" | "official_organizer" | "reliable_listing" | "secondary";
export type ResearchFactKind = "extracted_fact" | "synthesized_insight";

export type ResearchJob = {
  mode: ResearchMode;
  placeTypes?: PlaceType[];
  geographicScope?: { description?: string; localities?: string[] };
  query?: string;
  slugs?: string[];
  verificationAgeDays?: number;
  constraints?: Record<string, string | number | boolean>;
};

export type ResearchSource = {
  id: string;
  url: string;
  title: string;
  domain: string;
  sourceType: ResearchSourceType;
  checkedAt: string;
  notes?: string;
};

export type ResearchFact = {
  /** Canonical updates may contain only source-backed extracted facts. */
  kind?: "extracted_fact";
  field: string;
  value: unknown;
  sourceRefs: string[];
  checkedAt: string;
  confidenceBasis: ResearchSourceType;
};

/** A review-only interpretation. It must never be applied as a canonical fact. */
export type ResearchInsight = {
  kind: "synthesized_insight";
  text: string;
  sourceRefs: string[];
  checkedAt: string;
  confidenceBasis: ResearchSourceType;
};

export type ResearchCandidate = {
  id: string;
  action: ResearchCandidateAction;
  status: ResearchCandidateStatus;
  canonicalSlug?: string;
  proposedPlace?: Record<string, unknown>;
  proposedChanges?: Record<string, unknown>;
  facts: ResearchFact[];
  insights?: ResearchInsight[];
  conflicts?: { field: string; candidates: { value: unknown; sourceRefs: string[] }[] }[];
  uncertaintyNotes?: string[];
};

export type ResearchProposal = {
  proposalVersion: "1.0";
  createdAt: string;
  researchJob: ResearchJob;
  summary: { total: number; ready: number; needsReview: number; hold: number };
  candidates: ResearchCandidate[];
  sourceCatalog: ResearchSource[];
};
