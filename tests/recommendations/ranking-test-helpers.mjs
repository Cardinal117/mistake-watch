import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const recommendationRoot = path.join(root, "lib", "recommendations");
const tempDirectory = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-recommendation-ranking-"),
);
let rankerPromise;

test.after(async () => {
  await rm(tempDirectory, { force: true, recursive: true });
});

export function candidate(index, overrides = {}) {
  const suffix = String(index).padStart(4, "0");
  return {
    candidateId: `candidate-${suffix}`,
    mediaId: `video-${suffix}`,
    sourceType: "youtube",
    title: `Fixture track ${suffix}`,
    ...overrides,
  };
}

export function aggregateFor(item, overrides = {}) {
  return {
    mediaId: item.mediaId,
    scopeType: "account",
    sourceType: item.sourceType,
    ...overrides,
  };
}

export function preferenceFor(item, state = "liked") {
  return {
    mediaId: item.mediaId,
    sourceType: item.sourceType,
    state,
  };
}

export function rankingContext(overrides = {}) {
  return {
    activeContributorMemberIds: [],
    nowMs: 1_800_000_000_000,
    queuedMedia: [],
    recentHistory: [],
    ...overrides,
  };
}

export function deterministicCandidates(count) {
  return Array.from({ length: count }, (_, index) =>
    candidate(index, {
      artist: `Artist ${index % 31}`,
      channelName: `Channel ${index % 47}`,
      contributorMemberId: `member-${index % 9}`,
      playlistId: `playlist-${index % 13}`,
      publishedAtMs: 1_700_000_000_000 + index * 60_000,
    }),
  );
}

export function resultByCandidateId(result, candidateId) {
  const entry = result.ranked.find(
    (rankedEntry) => rankedEntry.candidate.candidateId === candidateId,
  );
  assert.ok(entry, `missing ranked result for ${candidateId}`);
  return entry;
}

export function assertRankedEntry(entry) {
  assert.equal(typeof entry.mediaKey, "string");
  assert.ok(entry.mediaKey.length > 0);
  assert.equal(Number.isFinite(entry.totalScore), true);
  assert.equal(typeof entry.components, "object");
  assert.ok(entry.components !== null);
  assert.equal(Array.isArray(entry.reasons), true);
  assert.ok(entry.reasons.length > 0, "ranked entries need a factual reason");
  for (const reason of entry.reasons) {
    if (typeof reason === "string") {
      assert.ok(reason.trim().length > 0);
      continue;
    }
    assert.equal(typeof reason, "object");
    assert.ok(reason !== null);
    assert.ok(
      Object.values(reason).some(
        (value) => typeof value === "string" && value.trim().length > 0,
      ),
      "structured reasons need a non-empty factual code or label",
    );
  }
}

export async function loadRanker() {
  rankerPromise ??= transpileRecommendationModule("rank.ts").then(
    async (outputPath) => {
      const loadedModule = await import(pathToFileURL(outputPath));
      assert.equal(
        typeof loadedModule.rankRecommendations,
        "function",
        "rank.ts must export rankRecommendations(input)",
      );
      return loadedModule.rankRecommendations;
    },
  );
  return rankerPromise;
}

async function transpileRecommendationModule(
  relativePath,
  visited = new Set(),
) {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  if (visited.has(normalizedPath)) {
    return outputPathFor(normalizedPath);
  }
  visited.add(normalizedPath);

  const sourcePath = path.join(recommendationRoot, normalizedPath);
  const source = await readFile(sourcePath, "utf8");
  const imports = relativeImports(source);

  for (const importPath of imports) {
    const dependency = resolveTypeScriptImport(normalizedPath, importPath);
    await transpileRecommendationModule(dependency, visited);
  }

  const outputPath = outputPathFor(normalizedPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  await writeFile(outputPath, rewriteRelativeImports(output));
  return outputPath;
}

function relativeImports(source) {
  const imports = new Set();
  const matcher = /(?:from\s+|import\s*)["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(matcher)) {
    imports.add(match[1]);
  }
  return imports;
}

function resolveTypeScriptImport(parentPath, importPath) {
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(parentPath), importPath),
  );
  return resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
}

function outputPathFor(relativePath) {
  return path.join(
    tempDirectory,
    relativePath.replace(/\.ts$/, ".mjs").replaceAll("/", path.sep),
  );
}

function rewriteRelativeImports(output) {
  return output.replace(
    /((?:from\s+|import\s*)["'])(\.[^"']+?)(?:\.ts)?(["'])/g,
    (_match, prefix, importPath, suffix) =>
      `${prefix}${importPath}.mjs${suffix}`,
  );
}
