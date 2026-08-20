import { chmod, mkdir, readdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_DIRECTORY = join(homedir(), "Documents", "Codex", "Utazasi-backups");
const BACKUP_PREFIX = "utazasi-runtime-";
const BACKUP_SUFFIX = ".json";
const DEFAULT_RETENTION_DAYS = 14;
const args = process.argv.slice(2);

function localTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function backupDirectory() {
  const requested = process.env.UTAZASI_BACKUP_DIRECTORY || DEFAULT_DIRECTORY;
  const directory = resolve(requested);
  const relativeToRepository = relative(REPOSITORY_ROOT, directory);
  if (!relativeToRepository.startsWith("..") && !relativeToRepository.startsWith("/")) {
    throw new Error("Az ütemezett mentések könyvtára nem lehet a Git repóban.");
  }
  return directory;
}

function retentionDays() {
  const configured = Number.parseInt(process.env.UTAZASI_BACKUP_RETENTION_DAYS || "", 10);
  const value = Number.isInteger(configured) ? configured : DEFAULT_RETENTION_DAYS;
  if (value < 1 || value > 90) throw new Error("Az UTAZASI_BACKUP_RETENTION_DAYS értéke 1 és 90 közötti egész szám lehet.");
  return value;
}

function isRuntimeBackup(filename) {
  return filename.startsWith(BACKUP_PREFIX) && filename.endsWith(BACKUP_SUFFIX);
}

async function pruneOnlyExpiredBackups(directory, olderThan) {
  const entries = await readdir(directory, { withFileTypes: true });
  const removed = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isRuntimeBackup(entry.name)) continue;
    const file = join(directory, entry.name);
    const metadata = await stat(file);
    if (metadata.mtimeMs >= olderThan.getTime()) continue;
    await rm(file, { force: false });
    removed.push(entry.name);
  }
  return removed;
}

function runReadOnlyBackup(output) {
  const result = spawnSync(process.execPath, ["--env-file=.env.local", "scripts/backup-runtime-data.mjs", "--output", output], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Az új runtime mentés nem készült el; a korábbi mentések változatlanul megmaradtak.");
}

async function main() {
  const directory = backupDirectory();
  const keepDays = retentionDays();
  const output = join(directory, `${BACKUP_PREFIX}${localTimestamp()}${BACKUP_SUFFIX}`);

  if (args.includes("--dry-run")) {
    process.stdout.write(JSON.stringify({ directory, output, keepDays, mode: "read-only" }, null, 2) + "\n");
    return;
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);

  // Pruning is deliberately after the new immutable snapshot succeeds.
  runReadOnlyBackup(output);
  const olderThan = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
  const removed = await pruneOnlyExpiredBackups(directory, olderThan);
  process.stdout.write(`Scheduled read-only backup complete: ${basename(output)}\n`);
  if (removed.length) process.stdout.write(`Removed ${removed.length} expired runtime backup(s) after success.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
