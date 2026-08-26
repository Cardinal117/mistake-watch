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
  path.join(tmpdir(), "mistake-watch-listen-visualization-"),
);
const contractPath = path.join(rootDir, "lib/player/listen-visualization.ts");
const contractJs = ts.transpileModule(await readFile(contractPath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: contractPath,
}).outputText;
const contractModulePath = path.join(tempDir, "listen-visualization.mjs");

await writeFile(contractModulePath, contractJs);

const {
  DEFAULT_LISTEN_VISUALIZATION_MODE,
  LISTEN_BACKGROUND_DIMMING,
  LISTEN_BACKGROUND_VIBRANCY,
  LISTEN_VISUAL_INTENSITY,
  createAmbientWaveformSamples,
  getListenVisualizerStagePresentation,
  getListenPresentationVariables,
  getListenVisualizationMode,
  isListenVisualizationMode,
  listenVisualizationModes,
  normalizeListenAmbientLevel,
  normalizeListenStageView,
  normalizeListenVisualizationMode,
} = await import(pathToFileURL(contractModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("Static Artwork is the safe default visualization", () => {
  assert.equal(DEFAULT_LISTEN_VISUALIZATION_MODE, "static-artwork");
  assert.deepEqual(
    listenVisualizationModes.map((mode) => mode.id),
    [
      "static-artwork",
      "off",
      "mirror-spectrum",
      "siri-ribbon",
      "dot-waves",
      "signal-bloom",
      "constellation",
    ],
  );
  assert.equal(
    getListenVisualizationMode("mirror-spectrum").inputSource,
    "local-detail",
  );
  assert.equal(
    getListenVisualizationMode("siri-ribbon").inputSource,
    "shared-rhythm",
  );
  assert.ok(listenVisualizationModes.every((mode) => mode.motionLayers <= 1));
  assert.equal(
    getListenVisualizationMode("static-artwork").powerProfile,
    "recommended",
  );
  assert.ok(
    listenVisualizationModes
      .filter((mode) => mode.motionLayers > 0)
      .every((mode) => ["beta", "experimental"].includes(mode.powerProfile)),
  );
});

test("unknown stored visualization values fail closed to the default", () => {
  assert.equal(isListenVisualizationMode("siri-ribbon"), true);
  assert.equal(isListenVisualizationMode("legacy-bars"), false);
  assert.equal(
    normalizeListenVisualizationMode("legacy-bars"),
    "static-artwork",
  );
  assert.equal(normalizeListenVisualizationMode(null), "static-artwork");
});

test("Listen stage selection fails closed to Discover", () => {
  assert.equal(typeof normalizeListenStageView, "function");
  assert.equal(normalizeListenStageView("discover"), "discover");
  assert.equal(normalizeListenStageView("visualizer"), "visualizer");
  assert.equal(normalizeListenStageView("queue"), "discover");
  assert.equal(normalizeListenStageView(null), "discover");
});

test("Visualizer stage reports compatible and fallback states honestly", () => {
  assert.equal(typeof getListenVisualizerStagePresentation, "function");

  assert.deepEqual(
    getListenVisualizerStagePresentation({
      ambientPrototypeEnabled: false,
      capability: {
        effectiveMode: "siri-ribbon",
        reason: null,
        source: "shared-rhythm",
      },
      selectedMode: "siri-ribbon",
    }),
    {
      activeMode: "siri-ribbon",
      fallbackActive: false,
      message: "Synchronized from the room's shared rhythm signal.",
      rendererLabel: "Siri Ribbon",
      statusLabel: "Shared room rhythm",
    },
  );

  assert.deepEqual(
    getListenVisualizerStagePresentation({
      ambientPrototypeEnabled: false,
      capability: {
        effectiveMode: "static-artwork",
        reason: "companion-required",
        source: "fallback",
      },
      selectedMode: "mirror-spectrum",
    }),
    {
      activeMode: "static-artwork",
      fallbackActive: true,
      message:
        "Mirror Spectrum needs local companion detail. Showing Static Artwork.",
      rendererLabel: "Static Artwork",
      statusLabel: "Fallback active",
    },
  );

  assert.deepEqual(
    getListenVisualizerStagePresentation({
      ambientPrototypeEnabled: true,
      capability: {
        effectiveMode: "static-artwork",
        reason: "shared-rhythm-unavailable",
        source: "fallback",
      },
      selectedMode: "dot-waves",
    }),
    {
      activeMode: "ambient-waveform",
      fallbackActive: true,
      message:
        "Dot Waves needs a fresh shared rhythm signal. Showing the development-only Ambient Waveform prototype.",
      rendererLabel: "Ambient Waveform",
      statusLabel: "Prototype fallback",
    },
  );
});

test("Ambient Waveform samples are mirrored, deterministic, and bounded", () => {
  assert.equal(typeof createAmbientWaveformSamples, "function");
  const first = createAmbientWaveformSamples("youtube:abc", 12.5, 48);
  const repeated = createAmbientWaveformSamples("youtube:abc", 12.5, 48);
  const advanced = createAmbientWaveformSamples("youtube:abc", 13, 48);

  assert.equal(first.length, 48);
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, advanced);
  assert.ok(first.every((sample) => sample >= -1 && sample <= 1));
  assert.ok(
    first.every((sample, index) => sample === first[first.length - index - 1]),
  );
});

test("ambient presentation levels are bounded and deterministic", () => {
  assert.equal(
    normalizeListenAmbientLevel(null, LISTEN_VISUAL_INTENSITY),
    LISTEN_VISUAL_INTENSITY.default,
  );
  assert.equal(normalizeListenAmbientLevel("27", LISTEN_VISUAL_INTENSITY), 25);
  assert.equal(
    normalizeListenAmbientLevel(140, LISTEN_VISUAL_INTENSITY),
    LISTEN_VISUAL_INTENSITY.max,
  );

  const subdued = getListenPresentationVariables(
    LISTEN_VISUAL_INTENSITY.min,
    LISTEN_BACKGROUND_DIMMING.min,
    LISTEN_BACKGROUND_VIBRANCY.min,
  );
  const strong = getListenPresentationVariables(
    LISTEN_VISUAL_INTENSITY.max,
    LISTEN_BACKGROUND_DIMMING.max,
    LISTEN_BACKGROUND_VIBRANCY.max,
  );

  assert.ok(
    strong["--listen-artwork-opacity"] > subdued["--listen-artwork-opacity"],
  );
  assert.ok(strong["--listen-dim-bottom"] > subdued["--listen-dim-bottom"]);
  assert.ok(
    strong["--listen-panel-dim-start"] > subdued["--listen-panel-dim-start"],
  );
  assert.ok(strong["--listen-room-dim-end"] > subdued["--listen-room-dim-end"]);
  assert.ok(strong["--listen-dim-edge"] <= 1);
  assert.ok(subdued["--listen-panel-dim-middle"] <= 0.4);
  assert.ok(subdued["--listen-panel-dim-start"] <= 0.45);
  assert.ok(subdued["--listen-room-dim-end"] <= 0.55);
  assert.ok(subdued["--listen-rail-dim-top"] <= 0.45);
  assert.ok(strong["--listen-panel-dim-end"] <= 0.75);
  assert.ok(strong["--listen-room-dim-end"] <= 0.75);
  assert.ok(strong["--listen-rail-dim-top"] <= 0.65);
  assert.ok(
    strong["--listen-background-saturation"] >
      subdued["--listen-background-saturation"],
  );
  assert.ok(
    strong["--listen-background-presence"] >
      subdued["--listen-background-presence"],
  );
  assert.ok(strong["--listen-background-saturation"] <= 1.65);
  assert.ok(strong["--listen-background-presence"] <= 1);
});

test("the Listen renderer uses the bounded canvas host", async () => {
  const [component, theme, visualizerStage, layout, css] = await Promise.all([
    readFile(
      path.join(
        rootDir,
        "components/room/listen/theme/listen-visualization.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(rootDir, "components/room/listen/theme/listen-theme.tsx"),
      "utf8",
    ),
    readFile(
      path.join(
        rootDir,
        "components/room/listen/stage/listen-visualizer-stage.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(rootDir, "components/room/listen/listen-mode-layout.tsx"),
      "utf8",
    ),
    readFile(path.join(rootDir, "app/globals.css"), "utf8"),
  ]);

  assert.match(component, /<canvas/);
  assert.match(component, /ListenCanvasEngine/);
  assert.match(component, /DPR_CAP = 1\.25/);
  assert.doesNotMatch(theme, /Array\.from\(\{ length: 96 \}\)/);
  assert.doesNotMatch(theme, /listen-center-wave-bar|boxShadow/);
  assert.doesNotMatch(layout, /ListenCenterWaveform/);
  assert.match(layout, /useListenVisualizationPreference/);
  assert.match(layout, /effectiveVisualizationMode !== "off"/);
  assert.match(layout, /effectiveVisualizationMode/);
  assert.match(
    layout,
    /<ListenAmbientBackdrop[\s\S]*mode=\{effectiveVisualizationMode\}/,
  );
  assert.match(
    layout,
    /roomRhythmProfile=\{liveRoom\.snapshot\.roomRhythmProfile\}/,
  );
  assert.match(theme, /mode === "static-artwork"/);
  assert.match(theme, /--listen-background-primary/);
  assert.match(theme, /--listen-background-secondary/);
  assert.doesNotMatch(theme, /<img/);
  assert.match(visualizerStage, /object-cover opacity-72 saturate-110/);
  assert.match(visualizerStage, /object-cover opacity-18 blur-2xl/);
  assert.doesNotMatch(css, /listen-center-wave-bar|listen-center-wave\s*\{/);
  assert.doesNotMatch(css, /listen-horizon-drift|listen-minimal-pulse/);
});

test("personalization provides bounded previews and ambient controls", async () => {
  const [panel, personalization, preference, ambientPreference] =
    await Promise.all([
      readFile(
        path.join(rootDir, "components/account/account-command-panel.tsx"),
        "utf8",
      ),
      readFile(
        path.join(rootDir, "components/account/personalization-section.tsx"),
        "utf8",
      ),
      readFile(
        path.join(
          rootDir,
          "components/room/listen/theme/use-listen-visualization-preference.ts",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          rootDir,
          "components/room/listen/theme/use-listen-ambient-preference.ts",
        ),
        "utf8",
      ),
    ]);

  assert.match(panel, /activeTab === "personalization"/);
  assert.match(panel, /<PersonalizationSection artworkUrl=/);
  assert.match(personalization, /role="radiogroup"/);
  assert.match(personalization, /type="radio"/);
  assert.doesNotMatch(
    personalization,
    /className="sr-only"[\s\S]{0,160}name="listen-visualization"/,
  );
  assert.match(personalization, /peer-focus-visible:ring-2/);
  assert.match(panel, /overflow-clip/);
  assert.match(personalization, /type="range"/);
  assert.match(personalization, /LISTEN_VISUAL_INTENSITY/);
  assert.match(personalization, /LISTEN_BACKGROUND_DIMMING/);
  assert.match(personalization, /LISTEN_BACKGROUND_VIBRANCY/);
  assert.match(personalization, /FALLBACK_PREVIEW_ARTWORK/);
  assert.match(personalization, /previewArtworkUrl/);
  assert.match(personalization, /option\.powerLabel/);
  assert.match(personalization, /option\.powerProfile/);
  assert.match(personalization, /5_000/);
  assert.match(personalization, /option\.id === previewMode/);
  assert.match(preference, /mw_listen_visualization_mode_v1/);
  assert.match(preference, /addEventListener\("storage"/);
  assert.match(preference, /normalizeListenVisualizationMode/);
  assert.match(ambientPreference, /mw_listen_visual_intensity_v1/);
  assert.match(ambientPreference, /mw_listen_background_dimming_v1/);
  assert.match(ambientPreference, /mw_listen_background_vibrancy_v1/);
  assert.match(ambientPreference, /addEventListener\("storage"/);
  assert.match(ambientPreference, /normalizeListenAmbientLevel/);
});
