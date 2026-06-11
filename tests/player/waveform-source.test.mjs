import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const tempDir = await mkdtemp(
  path.join(tmpdir(), "mistake-watch-waveform-source-"),
);
const sourcePath = path.join(rootDir, "lib/player/waveform-source.ts");
const sourceText = await readFile(sourcePath, "utf8");
const sourceJs = ts.transpileModule(sourceText, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;
const sourceModulePath = path.join(tempDir, "waveform-source.mjs");

await writeFile(sourceModulePath, sourceJs);

const { hasReadyWaveformPeaks, resolveWaveformSource } = await import(
  pathToFileURL(sourceModulePath)
);

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("YouTube iframe sources use honest fallback visuals by default", () => {
  const plan = resolveWaveformSource({
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  assert.equal(plan.kind, "youtube_embed");
  assert.equal(plan.analysisMode, "fallback_progress");
  assert.equal(plan.supportsLiveAnalysis, false);
  assert.equal(plan.usesIframeAudio, true);
  assert.match(plan.reason, /iframe audio cannot be sampled/i);
});

test("matched ready R2 assets prefer precomputed peaks over live analysis", () => {
  const plan = resolveWaveformSource({
    firstPartyAsset: {
      kind: "r2_media",
      sourceUrl: "https://assets.example.test/song.mp3",
      waveform_peaks_key: "waveforms/song.json",
      waveform_status: "ready",
    },
    sourceType: "youtube",
  });

  assert.equal(plan.kind, "r2_media");
  assert.equal(plan.analysisMode, "precomputed_peaks");
  assert.equal(plan.usesIframeAudio, false);
  assert.equal(plan.contract.waveform_peaks_key, "waveforms/song.json");
});

test("Cloudflare Stream assets without ready peaks use lightweight fallback visuals", () => {
  const plan = resolveWaveformSource({
    firstPartyAsset: {
      kind: "stream_media",
      waveform_status: "pending",
    },
  });

  assert.equal(plan.kind, "stream_media");
  assert.equal(plan.analysisMode, "fallback_progress");
  assert.equal(plan.supportsLiveAnalysis, false);
});

test("direct and HLS media can opt into browser analyser when the client allows it", () => {
  const directPlan = resolveWaveformSource(
    {
      sourceType: "direct",
      sourceUrl: "https://media.example.test/song.mp3",
    },
    { allowLiveAnalysis: true },
  );
  const hlsPlan = resolveWaveformSource(
    {
      sourceType: "hls",
      sourceUrl: "https://media.example.test/live.m3u8",
    },
    { allowLiveAnalysis: true },
  );

  assert.equal(directPlan.kind, "direct_media");
  assert.equal(directPlan.analysisMode, "browser_analyser");
  assert.equal(directPlan.supportsLiveAnalysis, true);
  assert.equal(hlsPlan.kind, "hls_media");
  assert.equal(hlsPlan.analysisMode, "browser_analyser");
  assert.equal(hlsPlan.supportsLiveAnalysis, true);
});

test("mobile-constrained clients avoid live analysis unless peaks are ready", () => {
  const plan = resolveWaveformSource(
    {
      sourceType: "direct",
      sourceUrl: "https://media.example.test/song.mp3",
    },
    { allowLiveAnalysis: true, mobileConstrained: true },
  );

  assert.equal(plan.analysisMode, "fallback_progress");
  assert.equal(plan.supportsLiveAnalysis, false);
});

test("reduced-motion clients receive stable static waveform plans", () => {
  const plan = resolveWaveformSource(
    {
      sourceType: "hls",
      sourceUrl: "https://media.example.test/live.m3u8",
    },
    { allowLiveAnalysis: true, reducedMotion: true },
  );

  assert.equal(plan.analysisMode, "static");
  assert.equal(plan.supportsLiveAnalysis, false);
});

test("future waveform metadata contract exposes ready peak detection", () => {
  assert.equal(
    hasReadyWaveformPeaks({
      waveform_peaks_url: "https://assets.example.test/waveform.json",
      waveform_status: "ready",
    }),
    true,
  );
  assert.equal(
    hasReadyWaveformPeaks({
      waveform_peaks_url: "https://assets.example.test/waveform.json",
      waveform_status: "pending",
    }),
    false,
  );
});
