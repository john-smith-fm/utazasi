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

## Coverage-driven research queue

The research:queue command creates a **read-only, bounded proposal** from the
existing canonical coverage metadata, open questions and verification age. It
groups the coverage map by locality and Place type, then proposes at most eight
explicit enrich jobs. It never calls OpenAI, writes canonical JSON, changes
Supabase or commits.

For a reviewable file, run:

    npm run research:queue -- --limit 8 --output research/queues/villasimius-enrichment.json

Each queue item names its canonical Place, locality, type, explicit
missing/partial areas and open questions. A human selects an item and passes
only its embedded research job to the existing bounded live provider. The queue
is therefore a prioritisation aid, not an autonomous scheduler. Missing
Mobility and photo coverage is reported but is not used by itself to start a
Place-research job: routes require their own approved source data, and images
must meet their separate reuse rules.

The queue also reads the approved initial Timeline in a read-only manner. A
Place that already appears in the family's planned program receives a visible,
bounded priority boost and lists the relevant dates and activities. This does
not infer a Place for free-text programs, change the Timeline, or start live
research; it only helps a human spend the limited enrichment batch on places
that matter to the actual trip.

## Full-catalogue validation run

The explicitly requested full-catalogue command creates one constrained,
review-only provider call per canonical Place. It is resumable: every
successfully saved proposal is skipped on the next run unless `--no-resume` is
given. It does not apply candidates, modify canonical JSON, write Supabase,
commit or deploy.

```bash
# Show the command usage. This never calls the provider.
npm run research:full -- --help

# First verify the 138-record plan without any provider call.
npm run research:full -- --dry-run

# Then create individually reviewable proposals. Interrupted runs continue.
npm run research:full -- --resume
```

Proposals are stored under `research/proposals/full-enrichment/`, while a
progress report is updated after every Place at
`research/reports/full-enrichment-progress.json`. Mobility, route duration,
prices, coordinates and images stay out of this pass because they require
separate evidence and approval rules.

## Facts and insights

Canonical changes accept only extracted_fact: a field-level statement with
direct source references, timestamp and source-quality basis.
synthesized_insight is review context only and must never be applied as a
canonical factual field. Existing legacy proposals without a kind remain
readable and are treated as extracted facts for compatibility; newly generated
live proposals label factual assertions explicitly.

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

### Private review endpoint

`POST /api/events/research` is the deployed equivalent for a future in-app
review surface. It accepts only a PIN-session-protected `seriesKey` and an
in-range `targetDate`, then performs one bounded OpenAI web search against the
series' configured official domain. It returns either a concrete daily Event
proposal or a `hold` result. It has no database, Timeline, Place or canonical
JSON write path; explicit human approval remains required.

## Automatic Watch rule

A concrete Event can receive a verified baseline at seed time, but it is not
watched merely because it exists. The Watch becomes active only after the
family accepts that Event into the Timeline. Deleting the last corresponding
Timeline item stops the Watch again. This prevents event-series research or
unaccepted suggestions from sending irrelevant notifications.
