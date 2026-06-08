import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(import.meta.dirname, "..");
const generatedDir = path.join(rootDir, "lib", "spacetime", "generated");
const tempRoot = path.join(rootDir, ".tmp");

await mkdir(tempRoot, { recursive: true });

const tempDir = await mkdtemp(
  path.join(tempRoot, "mistake-watch-spacetime-token-"),
);

try {
  await transpileGeneratedBindings(generatedDir, tempDir);

  const env = readLocalEnv();
  const uri =
    process.env.NEXT_PUBLIC_SPACETIME_URI ??
    env.NEXT_PUBLIC_SPACETIME_URI ??
    "ws://127.0.0.1:5372";
  const databaseName =
    process.env.NEXT_PUBLIC_SPACETIME_MODULE ??
    env.NEXT_PUBLIC_SPACETIME_MODULE ??
    "mistake-watch-rooms";
  const { DbConnection } = await import(
    pathToFileURL(path.join(tempDir, "index.mjs")).href
  );

  console.log(`Connecting to SpacetimeDB: ${uri}`);
  console.log(`Database: ${databaseName}`);
  console.log("");

  await new Promise((resolve, reject) => {
    let settled = false;
    let connection;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      connection?.disconnect();
      reject(new Error("Timed out while creating SpacetimeDB server token."));
    }, 10_000);

    connection = DbConnection.builder()
      .withUri(uri)
      .withDatabaseName(databaseName)
      .onConnect((connected, identity, token) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        const serverIdentity = identity ?? connected.identity;
        const serverToken = token ?? connected.token;

        if (!serverIdentity || !serverToken) {
          connected.disconnect();
          reject(new Error("SpacetimeDB did not return an identity and token."));
          return;
        }

        const identityHex =
          serverIdentity?.toHexString?.() ?? String(serverIdentity);

        console.log("SpacetimeDB server identity");
        console.log("==========================");
        console.log(`Database: ${databaseName}`);
        console.log(`URI: ${uri}`);
        console.log("");
        console.log("Add this identity_hex to the private trusted_seed_issuer table:");
        console.log(identityHex);
        console.log("");
        console.log("Store this token as SPACETIME_SERVER_AUTH_TOKEN:");
        console.log(serverToken);
        console.log("");
        console.log("The identity is not secret. The token is secret.");
        connected.disconnect();
        resolve();
      })
      .onConnectError((_ctx, error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        reject(error ?? new Error("Failed to connect to SpacetimeDB."));
      })
      .onDisconnect(() => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        reject(new Error("Disconnected before token creation completed."));
      })
      .build();
  });
} catch (error) {
  console.error("Could not create SpacetimeDB server token.");
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  await rm(tempDir, { force: true, recursive: true });
}

async function transpileGeneratedBindings(sourceDir, outDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  await mkdir(outDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outPath = path.join(outDir, entry.name);

    if (entry.isDirectory()) {
      await transpileGeneratedBindings(sourcePath, outPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const source = await readFile(sourcePath, "utf8");
    const js = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: sourcePath,
    }).outputText;
    const rewritten = js.replace(
      /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
      (_match, prefix, specifier, suffix) => {
        if (path.extname(specifier)) {
          return `${prefix}${specifier}${suffix}`;
        }

        return `${prefix}${specifier}.mjs${suffix}`;
      },
    );

    await writeFile(outPath.replace(/\.ts$/, ".mjs"), rewritten);
  }
}

function readLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");

  if (!existsSync(envPath)) {
    return {};
  }

  const parsed = {};

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    parsed[line.slice(0, separatorIndex).trim()] = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }

  return parsed;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  if (error?.constructor?.name) {
    return error.constructor.name;
  }

  return String(error);
}
