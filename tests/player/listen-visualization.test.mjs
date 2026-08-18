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
  getListenVisualizationMode,
  isListenVisualizationMode,
  listenVisualizationModes,
  normalizeListenVisualizationMode,
} = await import(pathToFileURL(contractModulePath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

test("Dynamic Horizon is the bounded default visualization", () => {
  assert.equal(DEFAULT_LISTEN_VISUALIZATION_MODE, "dynamic-horizon");
  assert.deepEqual(
    listenVisualizationModes.map((mode) => mode.id),
    [
      "dynamic-horizon",
      "signal-ribbon",
      "minimal-pulse",
      "static-artwork",
      "off",
    ],
  );
  assert.equal(getListenVisualizationMode("dynamic-horizon").motionLayers, 3);
  assert.ok(listenVisualizationModes.every((mode) => mode.motionLayers <= 3));
});

test("unknown stored visualization values fail closed to the default", () => {
  assert.equal(isListenVisualizationMode("signal-ribbon"), true);
  assert.equal(isListenVisualizationMode("legacy-bars"), false);
  assert.equal(
    normalizeListenVisualizationMode("legacy-bars"),
    "dynamic-horizon",
  );
  assert.equal(normalizeListenVisualizationMode(null), "dynamic-horizon");
});

test("the Listen renderer removes the 96-bar glow implementation", async () => {
  const [component, theme, layout, css] = await Promise.all([
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
      path.join(rootDir, "components/room/listen/listen-mode-layout.tsx"),
      "utf8",
    ),
    readFile(path.join(rootDir, "app/globals.css"), "utf8"),
  ]);

  assert.equal(
    component.match(/listen-horizon-layer listen-horizon-layer--/g)?.length,
    3,
  );
  assert.doesNotMatch(theme, /Array\.from\(\{ length: 96 \}\)/);
  assert.doesNotMatch(theme, /listen-center-wave-bar|boxShadow/);
  assert.doesNotMatch(layout, /ListenCenterWaveform/);
  assert.match(layout, /useListenVisualizationPreference/);
  assert.match(layout, /visualizationMode !== "off"/);
  assert.doesNotMatch(css, /listen-center-wave-bar|listen-center-wave\s*\{/);
  assert.match(css, /translate3d\(-50%, 0, 0\)/);
  assert.match(css, /animation-play-state: paused/);
});

test("visual motion uses local masks without animated filters or shadows", async () => {
  const css = await readFile(path.join(rootDir, "app/globals.css"), "utf8");
  const start = css.indexOf(".listen-visualization {");
  const end = css.indexOf(".animation-paused {", start);
  const visualizationCss = css.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(visualizationCss, /listen-wave-mask\.svg/);
  assert.match(visualizationCss, /listen-ribbon-mask\.svg/);
  assert.doesNotMatch(visualizationCss, /box-shadow|filter:|backdrop-filter/);
  assert.doesNotMatch(visualizationCss, /clip-path|animation[^;]+color/);
});

test("personalization provides one bounded keyboard-operable preview", async () => {
  const [panel, personalization, preference] = await Promise.all([
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
  ]);

  assert.match(panel, /activeTab === "personalization"/);
  assert.match(panel, /<PersonalizationSection \/>/);
  assert.match(personalization, /role="radiogroup"/);
  assert.match(personalization, /type="radio"/);
  assert.match(personalization, /5_000/);
  assert.match(personalization, /option\.id === previewMode/);
  assert.match(preference, /mw_listen_visualization_mode_v1/);
  assert.match(preference, /addEventListener\("storage"/);
  assert.match(preference, /normalizeListenVisualizationMode/);
});

test("wave assets retain source attribution and local delivery", async () => {
  const [license, wave, ribbon] = await Promise.all([
    readFile(
      path.join(rootDir, "public/visuals/LICENSE.listen-waves.md"),
      "utf8",
    ),
    readFile(path.join(rootDir, "public/visuals/listen-wave-mask.svg"), "utf8"),
    readFile(
      path.join(rootDir, "public/visuals/listen-ribbon-mask.svg"),
      "utf8",
    ),
  ]);

  assert.match(license, /Jhey Tompkins/);
  assert.match(license, /MIT/);
  assert.match(license, /codepen\.io\/jh3y\/pen\/poEvKxo/);
  assert.match(wave, /viewBox="0 0 1440 320"/);
  assert.match(ribbon, /stroke="white"/);
  assert.doesNotMatch(`${wave}${ribbon}`, /(?:href|src)="https?:\/\//);
});
