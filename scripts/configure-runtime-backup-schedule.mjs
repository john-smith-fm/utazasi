import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");
const LABEL = "hu.utazasi.runtime-backup";
const LAUNCH_AGENTS = join(homedir(), "Library", "LaunchAgents");
const PLIST_PATH = join(LAUNCH_AGENTS, `${LABEL}.plist`);
const BACKUP_DIRECTORY = process.env.UTAZASI_BACKUP_DIRECTORY || join(homedir(), "Documents", "Codex", "Utazasi-backups");
const args = process.argv.slice(2);

function plist() {
  const escaped = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array>
    <string>${escaped(process.execPath)}</string>
    <string>${escaped(join(REPOSITORY_ROOT, "scripts", "backup-runtime-scheduled.mjs"))}</string>
  </array>
  <key>WorkingDirectory</key><string>${escaped(REPOSITORY_ROOT)}</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
  <key>ProcessType</key><string>Background</string>
  <key>Umask</key><integer>63</integer>
  <key>StandardOutPath</key><string>${escaped(join(BACKUP_DIRECTORY, "runtime-backup.log"))}</string>
  <key>StandardErrorPath</key><string>${escaped(join(BACKUP_DIRECTORY, "runtime-backup-error.log"))}</string>
</dict></plist>
`;
}

function launchctl(...command) {
  const result = spawnSync("launchctl", command, { encoding: "utf8" });
  if (result.status !== 0 && !/No such process|Could not find service/i.test(result.stderr || "")) {
    throw new Error(result.stderr || "A macOS ütemező beállítása nem sikerült.");
  }
}

function scheduleIsLoaded() {
  const result = spawnSync("launchctl", ["print", `gui/${process.getuid()}/${LABEL}`], { encoding: "utf8" });
  return result.status === 0;
}

async function install() {
  await mkdir(LAUNCH_AGENTS, { recursive: true, mode: 0o700 });
  await mkdir(BACKUP_DIRECTORY, { recursive: true, mode: 0o700 });
  await chmod(BACKUP_DIRECTORY, 0o700);
  // `launchctl bootout` returns an I/O error if there is no previous service.
  // Ask first so a first-time installation does not look like a failed backup setup.
  if (scheduleIsLoaded()) launchctl("bootout", `gui/${process.getuid()}`, PLIST_PATH);
  await writeFile(PLIST_PATH, plist(), { encoding: "utf8", mode: 0o600 });
  await chmod(PLIST_PATH, 0o600);
  launchctl("bootstrap", `gui/${process.getuid()}`, PLIST_PATH);
  process.stdout.write(`Napi, csak-olvasási Utazási mentés aktiválva: minden nap 03:30.\nMentési mappa: ${BACKUP_DIRECTORY}\n`);
}

async function uninstall() {
  if (scheduleIsLoaded()) launchctl("bootout", `gui/${process.getuid()}`, PLIST_PATH);
  await unlink(PLIST_PATH).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  process.stdout.write("Az ütemezett mentés kikapcsolva. Meglévő mentések megmaradtak.\n");
}

async function main() {
  if (args.includes("--print-plist")) return process.stdout.write(plist());
  if (args.includes("--status")) {
    const content = await readFile(PLIST_PATH, "utf8").catch(() => null);
    process.stdout.write(content ? `Aktív konfiguráció: ${PLIST_PATH}\n` : "Nincs telepített napi Utazási mentés.\n");
    return;
  }
  if (args.includes("--uninstall")) return uninstall();
  if (args.includes("--install")) return install();
  throw new Error("Használat: --install | --status | --uninstall | --print-plist");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
