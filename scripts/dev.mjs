import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const host = process.env.MISTAKE_WATCH_HOST ?? "127.0.0.1";
const appPort = process.env.MISTAKE_WATCH_PORT ?? "5371";
const spacetimePort = process.env.MISTAKE_WATCH_SPACETIME_PORT ?? "5372";
const spacetimeUrl = `http://${host}:${spacetimePort}/`;
const spacetimeAddr = `${host}:${spacetimePort}`;

let startedSpacetime = null;
let startedNext = null;
let shuttingDown = false;

async function isSpacetimeReachable() {
  try {
    await fetch(spacetimeUrl, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

function resolveSpacetimeCli() {
  if (process.env.SPACETIME_CLI) {
    return process.env.SPACETIME_CLI;
  }

  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const localCli = path.join(
      process.env.LOCALAPPDATA,
      "SpacetimeDB",
      "spacetime.exe",
    );

    if (existsSync(localCli)) {
      return localCli;
    }
  }

  return "spacetime";
}

function resolveNextCli() {
  return path.join(
    rootDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );
}

function pipeOutput(child, label) {
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });
}

async function waitForSpacetime(child) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`SpacetimeDB exited early with code ${child.exitCode}.`);
    }

    if (await isSpacetimeReachable()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`SpacetimeDB did not answer on ${spacetimeUrl}.`);
}

async function ensureSpacetime() {
  if (await isSpacetimeReachable()) {
    console.log(`[dev] SpacetimeDB already reachable at ${spacetimeUrl}`);
    return;
  }

  const spacetimeCli = resolveSpacetimeCli();
  console.log(`[dev] Starting SpacetimeDB on ${spacetimeAddr}`);

  startedSpacetime = spawn(
    spacetimeCli,
    ["start", "--listen-addr", spacetimeAddr, "--non-interactive"],
    {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  pipeOutput(startedSpacetime, "spacetime");
  await waitForSpacetime(startedSpacetime);
  console.log(`[dev] SpacetimeDB ready at ${spacetimeUrl}`);
}

function startNext() {
  const nextCli = resolveNextCli();
  console.log(`[dev] Starting Mistake Watch at http://${host}:${appPort}`);

  startedNext = spawn(nextCli, ["dev", "--hostname", host, "--port", appPort], {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true,
  });

  startedNext.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

function cleanup() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (startedNext && startedNext.exitCode === null) {
    startedNext.kill();
  }

  if (startedSpacetime && startedSpacetime.exitCode === null) {
    startedSpacetime.kill();
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

try {
  await ensureSpacetime();
  startNext();
} catch (error) {
  cleanup();
  console.error(`[dev] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
