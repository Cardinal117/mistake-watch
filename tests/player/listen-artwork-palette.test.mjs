import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  path.join(tmpdir(), "mistake-watch-listen-artwork-palette-"),
);
const sourcePath = path.join(rootDir, "lib/player/listen-artwork-palette.ts");
const source = await readFile(sourcePath, "utf8");
const outputPath = path.join(tempDir, "listen-artwork-palette.mjs");
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourcePath,
}).outputText;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);

const { deriveListenArtworkTheme } = await import(pathToFileURL(outputPath));

test.after(async () => {
  await rm(tempDir, { force: true, recursive: true });
});

const fallback = {
  backgroundPrimary: "18 24 32",
  backgroundSecondary: "12 16 22",
  primary: "32 210 190",
  secondary: "76 170 220",
  shadow: "32 210 190",
  wave: "120 240 225",
};

test("palette keeps dominant colors in the background and promotes a vivid highlight", () => {
  const pixels = rgbaPixels([
    ...repeat([28, 52, 72], 70),
    ...repeat([46, 92, 76], 20),
    ...repeat([225, 92, 70], 10),
  ]);
  const theme = deriveListenArtworkTheme(pixels, fallback);

  assert.notEqual(theme.primary, theme.backgroundPrimary);
  assert.match(theme.primary, /^\d+ \d+ \d+$/);
  assert.match(theme.backgroundPrimary, /^\d+ \d+ \d+$/);

  const [accentRed, , accentBlue] = theme.primary.split(" ").map(Number);
  const [backgroundRed, , backgroundBlue] = theme.backgroundPrimary
    .split(" ")
    .map(Number);

  assert.ok(
    accentRed > accentBlue,
    "the coral highlight should drive controls",
  );
  assert.ok(
    backgroundBlue > backgroundRed,
    "the dominant blue should drive the room background",
  );
});

test("a single noisy pixel cannot become the room accent", () => {
  const pixels = rgbaPixels([
    ...repeat([38, 92, 116], 98),
    [255, 0, 255],
    [255, 0, 255],
  ]);
  const theme = deriveListenArtworkTheme(pixels, fallback);
  const [red, green, blue] = theme.primary.split(" ").map(Number);

  assert.ok(!(red > 220 && blue > 220 && green < 80));
});

test("an empty image safely preserves the fallback theme", () => {
  assert.deepEqual(
    deriveListenArtworkTheme(new Uint8ClampedArray(), fallback),
    fallback,
  );
});

function repeat(rgb, count) {
  return Array.from({ length: count }, () => rgb);
}

function rgbaPixels(colors) {
  return new Uint8ClampedArray(
    colors.flatMap(([red, green, blue]) => [red, green, blue, 255]),
  );
}
