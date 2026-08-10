# Utazási Research Agent Contract

## Purpose

The Research Agent produces reviewable proposals for long-lived destination knowledge. It can discover candidates, enrich known Places, or verify potentially stale records.

It does not update canonical knowledge, Supabase, or the Timeline. The user-facing Planning Agent is a separate future feature.

## Canonical boundary

`knowledge/places/*.json` is the approved source of truth. Research output belongs under `research/proposals/` and is not active application knowledge. A proposal can become canonical only through an explicit deterministic apply command followed by a separate human-reviewed Git commit.

## ResearchJob

`ResearchJob` supports `discover`, `enrich`, and `verify` modes. It may constrain Place types, localities, explicit slugs, verification age, and a free-text research query. Geographic scope is supplied by the job; it is never globally hard-coded.

## Proposal and evidence

Every proposal contains candidates and a source catalog. Facts reference source IDs, their verification date, and a source-quality category. Model output is never evidence; URLs must originate from the trusted research provider in v2G.2.

Candidate status is one of:

- `ready_for_approval`: identity, minimum Place data, source and verification date are clear;
- `needs_review`: meaningful ambiguity, conflict or insufficient evidence remains;
- `hold`: evidence is too weak or the candidate should not be applied.

Unknown fields remain absent. The agent never guesses coordinates, opening hours, access, prices, ratings, closure or child-friendliness.

## Source policy

Preferred sources are official businesses or institutions, municipality, government, tourism authority, official event organizer, reliable listing, then secondary sources. A strong official source can establish a stable fact. Dynamic or conflicting information requires explicit freshness and may need additional evidence.

## Identity and duplicate policy

The agent compares slug, normalized name, locality, address, official URL and type against canonical Places. Ambiguous identity is `needs_review`; it is never auto-merged. A possible closure or rename is also review-only until sufficiently verified.

## Deterministic apply

The apply tool accepts only explicit candidate IDs with `ready_for_approval` status. It validates source references, field allowlists, supported Place types and global slug uniqueness. It refuses HOLD candidates. It has a dry-run mode and preserves existing canonical values during enrichments by filling only missing values.

The tool does not research, commit, push or deploy. Changed category JSON files alone receive a version/change-log update.

## Security and v2G.2

v2G.1 has no live provider and no credentials. v2G.2 uses the OpenAI Responses API with its built-in web search tool, server-side only. `OPENAI_API_KEY` is read only by the local research CLI or future server routes; it is never a `NEXT_PUBLIC_` variable and is never committed.

The live command is deliberately narrow:

```bash
npm run research:live -- research/fixtures/restaurant-discover-job.json --output research/proposals/restaurant-discover.json
```

It accepts a validated job, makes one bounded web-search request, and writes only a review proposal below `research/proposals/`. It does not fetch arbitrary user URLs, update canonical JSON, write Supabase, commit, push, or deploy. The provider extracts URLs only from the web-search response; a candidate fact referring to any other URL is rejected. Timeouts, an eight-source limit, an eight-candidate limit, source validation, duplicate detection and the existing deterministic apply gate remain in force.

## Relationship to v3A

Research answers: what should become long-lived destination knowledge? Planning answers: what should the family do or know now? Live Planning findings never become canonical automatically.

## Daily Event Research

Event series are research context, not Timeline programs. The bounded Event Research command can examine one selected day within a known series, using only that series' official source domain. Its output is either a `hold` or one reviewable concrete daily Event proposal with an explicit date, start time, end time and provider-confirmed official source.

```bash
npm run research:event -- live research/fixtures/invaso-sep-02-job.json --output research/proposals/events/invaso-sep-02.json
```

The command only writes a proposal under `research/proposals/events/`. Applying a ready proposal still requires its explicit candidate ID, a separate human review, then a Git commit and seed. It never creates a Timeline item, writes Supabase, commits, pushes or deploys on its own.
