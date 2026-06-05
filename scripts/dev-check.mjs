import { existsSync, readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const rootDir = path.resolve(import.meta.dirname, "..");
const defaultHost = process.env.MISTAKE_WATCH_HOST ?? "127.0.0.1";
const defaultAppPort = Number(process.env.MISTAKE_WATCH_PORT ?? "5371");
const defaultSpacetimePort = Number(
  process.env.MISTAKE_WATCH_SPACETIME_PORT ?? "5372",
);
const execFileAsync = promisify(execFile);

const requiredPublicEnv = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SPACETIME_URI",
  "NEXT_PUBLIC_SPACETIME_MODULE",
];

const requiredServerEnv = ["SUPABASE_SECRET_KEY", "YOUTUBE_API_KEY"];

const forbiddenPublicSecrets = [
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_YOUTUBE_API_KEY",
];

function stripQuotes(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function parseEnvFile(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (key) {
      parsed[key] = stripQuotes(value);
    }
  }

  return parsed;
}

function makeCheck(level, label, detail, fix) {
  return { level, label, detail, fix };
}

function isLocalAppUrl(value) {
  return /^https?:\/\/(127\.0\.0\.1|localhost):5371(?:\/|$)/.test(value);
}

function isLocalSpacetimeUri(value) {
  return /^(ws|http):\/\/(127\.0\.0\.1|localhost):5372(?:\/|$)/.test(value);
}

export function validateDevEnvironment(env, { envLocalExists }) {
  const checks = [];

  checks.push(
    envLocalExists
      ? makeCheck("pass", ".env.local", "Local environment file exists.")
      : makeCheck(
          "fail",
          ".env.local",
          "Local environment file is missing.",
          "Create it from .env.example and fill the real local/prod-compatible values.",
        ),
  );

  for (const key of requiredPublicEnv) {
    checks.push(
      env[key]
        ? makeCheck("pass", key, "Configured.")
        : makeCheck(
            "fail",
            key,
            "Missing required public environment variable.",
            `Add ${key} to .env.local and Vercel production if it is missing there too.`,
          ),
    );
  }

  for (const key of requiredServerEnv) {
    checks.push(
      env[key]
        ? makeCheck("pass", key, "Configured.")
        : makeCheck(
            "fail",
            key,
            "Missing required server-only environment variable.",
            `Add ${key} to .env.local. Do not prefix it with NEXT_PUBLIC_.`,
          ),
    );
  }

  for (const key of forbiddenPublicSecrets) {
    checks.push(
      env[key]
        ? makeCheck(
            "fail",
            key,
            "Secret-looking value is exposed as a public browser variable.",
            `Remove ${key}. Server-only secrets must not use NEXT_PUBLIC_.`,
          )
        : makeCheck("pass", key, "Not present."),
    );
  }

  if (env.NEXT_PUBLIC_APP_URL && !isLocalAppUrl(env.NEXT_PUBLIC_APP_URL)) {
    checks.push(
      makeCheck(
        "warn",
        "NEXT_PUBLIC_APP_URL",
        "This does not point to http://127.0.0.1:5371 for local development.",
        "Use the local URL in .env.local. Keep production values in Vercel.",
      ),
    );
  }

  if (
    env.NEXT_PUBLIC_SPACETIME_URI &&
    !isLocalSpacetimeUri(env.NEXT_PUBLIC_SPACETIME_URI)
  ) {
    checks.push(
      makeCheck(
        "warn",
        "NEXT_PUBLIC_SPACETIME_URI",
        "This points away from the local SpacetimeDB service.",
        "Use ws://127.0.0.1:5372 for local parity unless deliberately testing production SpacetimeDB.",
      ),
    );
  }

  return checks;
}

export function validateSpacetimeConfig(env, spacetimeConfig) {
  const checks = [];
  const configuredDatabase = spacetimeConfig?.database;

  if (!configuredDatabase) {
    checks.push(
      makeCheck(
        "fail",
        "spacetime.json database",
        "Could not read a database name from spacetime.json.",
        "Set the root spacetime.json database field to the expected local module name.",
      ),
    );
    return checks;
  }

  if (env.NEXT_PUBLIC_SPACETIME_MODULE !== configuredDatabase) {
    checks.push(
      makeCheck(
        "fail",
        "SpacetimeDB module parity",
        `.env.local points to ${env.NEXT_PUBLIC_SPACETIME_MODULE || "(missing)"} but spacetime.json uses ${configuredDatabase}.`,
        `Set NEXT_PUBLIC_SPACETIME_MODULE=${configuredDatabase} or deliberately publish/generate against the alternate database.`,
      ),
    );
    return checks;
  }

  checks.push(
    makeCheck(
      "pass",
      "SpacetimeDB module parity",
      `Frontend module matches spacetime.json database: ${configuredDatabase}.`,
    ),
  );

  return checks;
}

function checkTcpPort(host, port, label) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (check) => {
      socket.destroy();
      resolve(check);
    };

    socket.setTimeout(1200);
    socket.once("connect", () => {
      done(makeCheck("pass", label, `${host}:${port} is accepting connections.`));
    });
    socket.once("timeout", () => {
      done(
        makeCheck(
          "fail",
          label,
          `${host}:${port} did not respond before timeout.`,
          "Start the service with npm run dev, or inspect the port for a stale process.",
        ),
      );
    });
    socket.once("error", () => {
      done(
        makeCheck(
          "fail",
          label,
          `${host}:${port} is not reachable.`,
          "Start the service with npm run dev.",
        ),
      );
    });
  });
}

async function checkHttp(url, label, expectedOk = true) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const ok = expectedOk ? response.ok : response.status < 500;

    if (ok) {
      return makeCheck("pass", label, `${url} responded with ${response.status}.`);
    }

    return makeCheck(
      "fail",
      label,
      `${url} responded with ${response.status}.`,
      "Check the local Next.js terminal output for the route error.",
    );
  } catch (error) {
    return makeCheck(
      "fail",
      label,
      `${url} is not reachable.`,
      `Start the app with npm run dev. If the port is open but HTTP hangs, stop the stale PID shown by the port-owner check. Details: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function parseNetstatPortOwners(output, port) {
  const owners = new Set();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const columns = trimmed.split(/\s+/);
    const localAddress = columns[1] ?? "";
    const state = columns[3] ?? "";
    const pid = columns.at(-1);

    if (
      localAddress.endsWith(`:${port}`) &&
      state === "LISTENING" &&
      /^\d+$/.test(pid) &&
      pid !== "0"
    ) {
      owners.add(pid);
    }
  }

  return [...owners];
}

async function checkPortOwner(port, label) {
  if (process.platform !== "win32") {
    return makeCheck("warn", label, "Port-owner reporting is only implemented on Windows.");
  }

  try {
    const { stdout } = await execFileAsync("netstat", ["-ano"], {
      windowsHide: true,
      timeout: 2500,
    });
    const owners = parseNetstatPortOwners(stdout, port);

    if (owners.length === 0) {
      return makeCheck("warn", label, `No owning PID found for port ${port}.`);
    }

    return makeCheck(
      "pass",
      label,
      `Port ${port} owner PID${owners.length > 1 ? "s" : ""}: ${owners.join(", ")}.`,
      `Manual cleanup if stale: Stop-Process -Id ${owners.join(",")} -Force`,
    );
  } catch (error) {
    return makeCheck(
      "warn",
      label,
      "Could not inspect port owner with netstat.",
      `Run netstat -ano | Select-String ":${port}" manually. Details: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function levelWeight(level) {
  if (level === "fail") {
    return 2;
  }

  if (level === "warn") {
    return 1;
  }

  return 0;
}

export function summarizeChecks(checks) {
  return checks.reduce(
    (summary, check) => {
      summary[check.level] += 1;
      return summary;
    },
    { pass: 0, warn: 0, fail: 0 },
  );
}

function printChecks(checks) {
  const sortedChecks = [...checks].sort(
    (a, b) => levelWeight(b.level) - levelWeight(a.level),
  );

  console.log("Mistake Watch dev check");
  console.log("=======================");

  for (const check of sortedChecks) {
    const icon =
      check.level === "pass" ? "PASS" : check.level === "warn" ? "WARN" : "FAIL";
    console.log(`[${icon}] ${check.label}: ${check.detail}`);

    if (check.fix) {
      console.log(`       Fix: ${check.fix}`);
    }
  }

  const summary = summarizeChecks(checks);
  console.log("");
  console.log(
    `Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`,
  );
}

async function run() {
  const envLocalPath = path.join(rootDir, ".env.local");
  const spacetimeConfigPath = path.join(rootDir, "spacetime.json");
  const envLocalExists = existsSync(envLocalPath);
  const fileEnv = envLocalExists
    ? parseEnvFile(readFileSync(envLocalPath, "utf8"))
    : {};
  const spacetimeConfig = existsSync(spacetimeConfigPath)
    ? JSON.parse(readFileSync(spacetimeConfigPath, "utf8"))
    : null;
  const env = { ...fileEnv, ...process.env };
  const appUrl = env.NEXT_PUBLIC_APP_URL || `http://${defaultHost}:${defaultAppPort}`;
  const appHealthUrl = new URL("/api/health", appUrl).toString();
  const checks = [
    ...validateDevEnvironment(env, { envLocalExists }),
    ...validateSpacetimeConfig(env, spacetimeConfig),
    await checkTcpPort(defaultHost, defaultAppPort, "Next.js port"),
    await checkTcpPort(defaultHost, defaultSpacetimePort, "SpacetimeDB port"),
    await checkPortOwner(defaultAppPort, "Next.js port owner"),
    await checkPortOwner(defaultSpacetimePort, "SpacetimeDB port owner"),
    await checkHttp(appUrl, "Local app"),
    await checkHttp(appHealthUrl, "Local health endpoint"),
  ];

  printChecks(checks);

  const summary = summarizeChecks(checks);
  process.exitCode = summary.fail > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}
