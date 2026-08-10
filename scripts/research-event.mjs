import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLiveEventProposal, saveEventProposal } from "./research/event-provider-openai.mjs";
import { loadCanonicalEvents, loadEventSeries, validateEventProposal, validateEventResearchJob } from "./research/event-core.mjs";

function fail(message) { throw new Error(message); }
function nextVersion(current) { const match = /^(\d+)\.(\d+)$/.exec(String(current)); return match ? `${match[1]}.${Number(match[2]) + 1}` : "1.1"; }

const [, , command, filePath, ...args] = process.argv;
const usage = "Használat: npm run research:event -- live <job.json> --output research/proposals/events/<név>.json | validate <proposal.json> | apply <proposal.json> --approve <id> [--apply]";
if (!command || !filePath) throw new Error(usage);

const document = JSON.parse(await readFile(filePath, "utf8"));
const series = await loadEventSeries();

if (command === "live") {
  validateEventResearchJob(document, series);
  const outputIndex = args.indexOf("--output");
  if (outputIndex < 0 || !args[outputIndex + 1]) fail("Az élő Event kutatáshoz kötelező a --output research/proposals/events/<név>.json.");
  const result = await createLiveEventProposal({ job: document });
  const saved = await saveEventProposal({ proposal: result.proposal, outputPath: args[outputIndex + 1] });
  console.log(JSON.stringify({ status: "event_proposal_created", file: saved, candidate: result.proposal.candidate.status, provider: result.provider }, null, 2));
} else if (command === "validate") {
  validateEventProposal(document, series);
  console.log("Az Event javaslat érvényes.");
} else if (command === "apply") {
  validateEventProposal(document, series);
  const approval = args.indexOf("--approve");
  if (approval < 0 || !args[approval + 1]) fail("Hiányzó explicit --approve jelöltazonosító.");
  if (document.candidate.id !== args[approval + 1] || document.candidate.action !== "add" || document.candidate.status !== "ready_for_approval") fail("Csak explicit READY ADD Event jelölt alkalmazható.");
  const canonical = await loadCanonicalEvents();
  if ((canonical.events ?? []).some((event) => event.id === document.candidate.event.id)) fail("Az Event már létezik a kanonikus JSON-ban.");
  const next = structuredClone(canonical);
  next.version = nextVersion(canonical.version);
  next.updated_at = new Date().toISOString().slice(0, 10);
  next.events.push(document.candidate.event);
  next.change_log = [...(Array.isArray(next.change_log) ? next.change_log : []), { date: next.updated_at, source: "event_research_proposal", candidate_id: document.candidate.id }];
  console.log(`Módosítandó: ${path.join("knowledge", "events", "events.json")}`);
  if (args.includes("--apply")) {
    await writeFile(path.join("knowledge", "events", "events.json"), `${JSON.stringify(next, null, 2)}\n`);
    console.log("A jóváhagyott Event a kanonikus JSON-ba került. Commit, seed és deploy nem történt.");
  } else console.log("Dry run: a kanonikus JSON nem változott. Tényleges alkalmazáshoz add meg a --apply kapcsolót.");
} else throw new Error(usage);
