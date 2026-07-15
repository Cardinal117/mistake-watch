import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const root = process.cwd();
const tempDirectory = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-recommendation-benchmark-"),
);

try {
  const sourcePath = path.join(root, "lib/recommendations/listen-discovery.ts");
  const source = (await readFile(sourcePath, "utf8")).replace(
    'import type { RoomQueueItem } from "@/lib/rooms";',
    "",
  );
  const outputPath = path.join(tempDirectory, "listen-discovery.mjs");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;

  await writeFile(outputPath, output);
  const { buildListenDiscoveryResult } = await import(
    pathToFileURL(outputPath)
  );

  const results = [250, 1_000].map((itemCount) => {
    const items = buildFixture(itemCount);
    const currentItem = items[0] ?? null;
    const samples = Array.from({ length: 5 }, () => {
      const started = performance.now();

      for (let index = 0; index < 250; index += 1) {
        buildListenDiscoveryResult({
          activeTab: "recommended",
          currentItem,
          items,
        });
      }

      return (performance.now() - started) / 250;
    }).sort((left, right) => left - right);

    return {
      itemCount,
      medianMs: round(samples[2]),
      p95Ms: round(samples[4]),
      runs: 5,
      samplesPerRun: 250,
    };
  });

  console.table(results);
} finally {
  await rm(tempDirectory, { force: true, recursive: true });
}

function buildFixture(itemCount) {
  return Array.from({ length: itemCount }, (_, index) => ({
    addedBy: `member-${index % 6}`,
    artist: `Artist ${index % 40}`,
    channelName: `Channel ${index % 60}`,
    duration: "3:30",
    id: `queue-${index}`,
    isPinned: index % 37 === 0,
    isPlayNext: index % 53 === 0,
    isUnavailable: index % 97 === 0,
    playlistId: `playlist-${index % 12}`,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=fixture${index}`,
    status: index === 0 ? "now" : index % 4 === 0 ? "played" : "queued",
    title: `Fixture media ${index}`,
    videoId: `fixture${index}`,
  }));
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}
