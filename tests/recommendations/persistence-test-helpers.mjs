import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const tempDirectory = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-recommendation-persistence-"),
);

test.after(async () => {
  await rm(tempDirectory, { force: true, recursive: true });
});

export async function loadTypeScript(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const source = await readFile(sourcePath, "utf8");
  const outputPath = path.join(
    tempDirectory,
    path.basename(relativePath).replace(/\.ts$/, ".mjs"),
  );
  let output = transpile(source, sourcePath);

  if (relativePath === "lib/recommendations/persistence.ts") {
    const eventSourcePath = path.join(
      root,
      "lib",
      "recommendations",
      "events.ts",
    );
    await writeFile(
      path.join(tempDirectory, "events.mjs"),
      transpile(await readFile(eventSourcePath, "utf8"), eventSourcePath),
    );
    output = output
      .replace('import "server-only";\n', "")
      .replace(
        /import \{ createSupabaseAdminClient \} from "@\/lib\/supabase\/admin";\n/,
        "const createSupabaseAdminClient = () => { throw new Error('not available in pure tests'); };\n",
      )
      .replace('from "./events";', 'from "./events.mjs";');
  }

  await writeFile(outputPath, output);
  return import(pathToFileURL(outputPath));
}

export async function loadMigration() {
  const migrationDirectory = path.join(root, "supabase", "migrations");
  const matches = (await readdir(migrationDirectory)).filter((name) =>
    /^\d+_recommendation_durable_store\.sql$/.test(name),
  );

  assert.equal(
    matches.length,
    1,
    "expected exactly one *_recommendation_durable_store.sql migration",
  );

  return (await readFile(path.join(migrationDirectory, matches[0]), "utf8"))
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tableDefinition(sql, tableName) {
  const match = sql.match(
    new RegExp(
      `create table(?: if not exists)? public\\.${tableName} \\((.*?)\\);`,
    ),
  );
  assert.ok(match, `missing public.${tableName} table`);
  return match[1];
}

export function assertServiceOnlyTable(sql, tableName) {
  assert.match(
    sql,
    new RegExp(`alter table public\\.${tableName} enable row level security`),
  );
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(
        `revoke all(?: privileges)? on (?:table )?public\\.${tableName} from [^;]*${role}`,
      ),
    );
  }
  assert.match(
    sql,
    new RegExp(
      `grant (?:all(?: privileges)?|select, insert, update, delete) on (?:table )?public\\.${tableName} to service_role`,
    ),
  );
}

export function assertBoundedColumn(definition, columnName) {
  assert.match(
    definition,
    new RegExp(
      `${columnName} (?:varchar\\(\\d+\\)|character varying\\(\\d+\\)|text).*?check \\([^)]*${columnName}`,
    ),
    `${columnName} must be explicitly bounded or check-constrained`,
  );
}

export function functionDefinition(sql, schemaName, functionName) {
  const match = sql.match(
    new RegExp(
      `create(?: or replace)? function ${schemaName}\\.${functionName}\\s*\\([^]*?\\$\\$;`,
    ),
  );
  assert.ok(match, `missing ${schemaName}.${functionName} function`);
  return match[0];
}

export function recommendationEvent(overrides = {}) {
  return {
    actorMemberId: "00000000-0000-4000-8000-000000000002",
    createdMs: 1_720_000_000_000n,
    eventId: "018f-event-0001",
    eventType: "playback_completed",
    idempotencyKey: "playback_completed:occurrence-1",
    mediaId: "hmJPbHVK-co",
    playbackOccurrenceId: "occurrence-1",
    reason: "natural_completion",
    roomId: "00000000-0000-4000-8000-000000000003",
    roomSessionId: "room-session-1",
    schemaVersion: 1,
    sourceType: "youtube",
    ...overrides,
  };
}

function transpile(source, sourcePath) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
}
