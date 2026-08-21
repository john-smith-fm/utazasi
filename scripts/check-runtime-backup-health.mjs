import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_DIRECTORY = join(homedir(), "Documents", "Codex", "Utazasi-backups");
const BACKUP_NAME = /^utazasi-runtime-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/;
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function formatAge(milliseconds) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 60) return `${minutes} perce`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} óra ${remainingMinutes} perce` : `${hours} órája`;
}

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Használat: npm run backup:health [-- --max-age-hours 30] [--directory /teljes/utvonal]\n");
    return;
  }

  const directory = option("--directory", process.env.UTAZASI_BACKUP_DIRECTORY || DEFAULT_DIRECTORY);
  const maxAgeHours = Number(option("--max-age-hours", "30"));
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new Error("A --max-age-hours értékének pozitív számnak kell lennie.");

  const names = await readdir(directory).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const candidates = await Promise.all(names.filter((name) => BACKUP_NAME.test(name)).map(async (name) => {
    const path = join(directory, name);
    const details = await stat(path);
    return details.isFile() && details.size > 0 ? { name, path, modifiedAt: details.mtimeMs } : null;
  }));
  const newest = candidates.filter(Boolean).sort((left, right) => right.modifiedAt - left.modifiedAt)[0];
  if (!newest) {
    process.stderr.write(`Nincs ellenőrizhető Utazási runtime-mentés ebben a mappában: ${directory}\n`);
    process.exitCode = 1;
    return;
  }

  const age = Date.now() - newest.modifiedAt;
  const limit = maxAgeHours * 60 * 60 * 1_000;
  const label = `Legutóbbi runtime-mentés: ${newest.name} (${formatAge(age)}).`;
  if (age > limit) {
    process.stderr.write(`${label} Ez régebbi a beállított ${maxAgeHours} órás határnál; ellenőrizd a napi mentés naplóját és a hálózatot.\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${label} A mentés friss.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
