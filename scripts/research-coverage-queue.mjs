import { buildCoverageQueue, saveCoverageQueue } from "./research/coverage-queue.mjs";

const args = process.argv.slice(2);
const valueAfter = (flag) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const limit = Number(valueAfter("--limit") ?? 8);
const staleAfterDays = Number(valueAfter("--stale-after-days") ?? 90);
const output = valueAfter("--output");
if (!Number.isInteger(limit) || limit < 1 || limit > 8) throw new Error("Használat: npm run research:queue -- [--limit 1..8] [--stale-after-days N] [--output research/queues/<név>.json]");
if (!Number.isInteger(staleAfterDays) || staleAfterDays < 1) throw new Error("A --stale-after-days pozitív egész szám legyen.");

const queue = await buildCoverageQueue({ limit, staleAfterDays });
if (output) {
  const file = await saveCoverageQueue({ queue, outputPath: output });
  console.log(JSON.stringify({ status: "queue_proposed", file, summary: queue.summary, liveResearchStarted: false }, null, 2));
} else {
  console.log(JSON.stringify(queue, null, 2));
}
