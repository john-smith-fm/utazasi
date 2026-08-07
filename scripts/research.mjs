import { readFile } from "node:fs/promises";
import { loadCanonicalPlaces, validateResearchJob, validateResearchProposal } from "./research/core.mjs";

const [, , command, proposalPath, ...args] = process.argv;
const usage = "Használat: npm run research -- live <job.json> --output research/proposals/<name>.json | run <job.json> | validate <proposal.json> | npm run research:apply -- <proposal.json> --approve id[,id] [--apply]";

if (!command || !proposalPath) throw new Error(usage);
const proposal = JSON.parse(await readFile(proposalPath, "utf8"));
const canonical = await loadCanonicalPlaces();

if (command === "live") {
  validateResearchJob(proposal);
  const outputIndex = args.indexOf("--output");
  if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error("Az élő kutatáshoz kötelező a --output research/proposals/<név>.json.");
  const { createLiveResearchProposal, saveResearchProposal } = await import("./research/provider-openai.mjs");
  const result = await createLiveResearchProposal({ job: proposal });
  const savedPath = await saveResearchProposal({ proposal: result.proposal, outputPath: args[outputIndex + 1] });
  console.log(JSON.stringify({ status: "proposal_created", file: savedPath, candidates: result.proposal.summary, provider: result.provider }, null, 2));
} else if (command === "run") {
  validateResearchJob(proposal);
  console.log(JSON.stringify({ status: "research_unavailable", message: "A v2G.1 még nem tartalmaz élő research providert; a job nem készített külső tényállítást." }, null, 2));
} else if (command === "validate") {
  validateResearchProposal(proposal, canonical);
  console.log("A kutatási javaslat érvényes.");
} else if (command === "apply") {
  const { applyPreparedChanges, prepareProposalApply } = await import("./research/apply.mjs");
  const approval = args.indexOf("--approve");
  if (approval < 0 || !args[approval + 1]) throw new Error("Hiányzó --approve jelöltazonosító.");
  const changes = await prepareProposalApply({ proposal, approvedIds: args[approval + 1].split(",") });
  console.log([...changes.keys()].map((file) => `Módosítandó: ${file}`).join("\n"));
  if (args.includes("--apply")) {
    await applyPreparedChanges(changes);
    console.log("A jóváhagyott jelöltek kanonikus JSON-ba kerültek. Commit és push nem történt.");
  } else console.log("Dry run: a fájlok nem változtak. Tényleges alkalmazáshoz add meg a --apply kapcsolót.");
} else throw new Error(usage);
