import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHOWCASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATE_MODES = [
  "static",
  "off",
  "bloom",
  "spectrum",
  "ribbon",
  "dots",
];
const HELD_MODES = ["silk", "grid", "constellation"];
const TEMPOS = [60, 90, 120, 160];
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const baseUrl = readArgument("url", "http://127.0.0.1:8765/");
const durationMs = Math.max(500, Number(readArgument("duration-ms", "2000")));
const fpsCap = Number(readArgument("fps", "30")) === 24 ? 24 : 30;
const includeHolds = readArgument("include-holds", "0") === "1";
const modes = includeHolds
  ? [...CANDIDATE_MODES, ...HELD_MODES]
  : CANDIDATE_MODES;
const outputPath = path.resolve(
  SHOWCASE_DIR,
  readArgument(
    "output",
    `artifacts/benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  ),
);

function showcaseUrl(viewport) {
  const url = new URL(baseUrl);
  url.searchParams.set("benchmark", "1");
  url.searchParams.set("fps", String(fpsCap));
  url.searchParams.set("viewport", viewport);
  return url.toString();
}

async function waitForShowcase(page) {
  await page.waitForFunction(() =>
    Boolean(window.visualizerShowcase?.benchmark),
  );
}

async function canvasIsNonblank(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#visualizer");
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    if (width < 2 || height < 2) return false;
    const pixels = context.getImageData(0, 0, width, height).data;
    let minimum = 255;
    let maximum = 0;
    const stride = Math.max(4, Math.floor(pixels.length / 8000 / 4) * 4);
    for (let index = 0; index < pixels.length; index += stride) {
      const luminance =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      minimum = Math.min(minimum, luminance);
      maximum = Math.max(maximum, luminance);
    }
    return maximum - minimum > 8;
  });
}

async function snapshot(page) {
  return page.evaluate(() => window.visualizerShowcase.benchmark.snapshot());
}

async function setModeAndPreset(page, mode) {
  await page.evaluate((requestedMode) => {
    window.visualizerShowcase.setMode(requestedMode);
    window.visualizerShowcase.benchmark.applySafePreset(requestedMode);
    window.visualizerShowcase.benchmark.setFpsCap(
      Number(new URLSearchParams(location.search).get("fps")) || 30,
    );
  }, mode);
}

async function runTempoSample(page, mode, bpm) {
  await page.evaluate(
    ({ requestedMode, requestedBpm }) => {
      window.visualizerShowcase.setMode(requestedMode);
      window.visualizerShowcase.benchmark.setInput({
        type: "tempo",
        bpm: requestedBpm,
      });
      window.visualizerShowcase.benchmark.reset();
      window.visualizerShowcase.benchmark.start();
    },
    { requestedMode: mode, requestedBpm: bpm },
  );
  await page.waitForTimeout(durationMs);
  const result = await snapshot(page);
  const nonblank = await canvasIsNonblank(page);
  await page.evaluate(() => window.visualizerShowcase.benchmark.stop());
  return { ...result, nonblank };
}

async function validateStoppedState(page, mode) {
  await page.evaluate((requestedMode) => {
    window.visualizerShowcase.setMode(requestedMode);
    window.visualizerShowcase.benchmark.setInput({ type: "tempo", bpm: 120 });
    window.visualizerShowcase.benchmark.reset();
    window.visualizerShowcase.benchmark.stop("paused-check");
  }, mode);
  const before = await snapshot(page);
  await page.waitForTimeout(650);
  const after = await snapshot(page);
  return {
    passed: !after.running && before.frameCount === after.frameCount,
    before,
    after,
  };
}

async function validateReducedMotion(page, mode) {
  await page.evaluate((requestedMode) => {
    window.visualizerShowcase.setMode(requestedMode);
    window.visualizerShowcase.benchmark.setInput({ type: "tempo", bpm: 120 });
    window.visualizerShowcase.benchmark.setReducedMotionForTest(true);
    window.visualizerShowcase.benchmark.start();
  }, mode);
  await page.waitForTimeout(300);
  const result = await snapshot(page);
  await page.evaluate(() => {
    window.visualizerShowcase.benchmark.setReducedMotionForTest(false);
    window.visualizerShowcase.benchmark.stop();
  });
  return {
    passed: !result.running && result.stoppedReason === "reduced-motion",
    snapshot: result,
  };
}

async function validateSingleLoop(page, mode) {
  await page.evaluate((requestedMode) => {
    window.visualizerShowcase.setMode(requestedMode);
    window.visualizerShowcase.benchmark.setInput({ type: "tempo", bpm: 120 });
    for (let index = 0; index < 4; index += 1) {
      window.visualizerShowcase.benchmark.start();
      window.visualizerShowcase.benchmark.stop();
    }
    window.visualizerShowcase.benchmark.reset();
    window.visualizerShowcase.benchmark.start();
  }, mode);
  await page.waitForTimeout(1600);
  const result = await snapshot(page);
  await page.evaluate(() => window.visualizerShowcase.benchmark.stop());
  return {
    passed: result.animated
      ? result.running &&
        result.observedFps >= fpsCap * 0.95 &&
        result.observedFps <= fpsCap * 1.2 &&
        result.frameCount <= Math.ceil((1600 / 1000) * fpsCap * 1.25)
      : !result.running &&
        result.stoppedReason === "static-mode" &&
        result.frameCount === 0,
    snapshot: result,
  };
}

async function runLiveSample(page, mode) {
  await page.evaluate((requestedMode) => {
    window.visualizerShowcase.setMode(requestedMode);
    window.visualizerShowcase.benchmark.setInput("live");
    window.visualizerShowcase.benchmark.reset();
  }, mode);
  try {
    await page.locator("body").click({ position: { x: 8, y: 8 } });
    await page.keyboard.press("Space");
    await page.waitForTimeout(350);
    const keyboardPlayback = await page.evaluate(
      () => !document.querySelector("#audio").paused,
    );
    if (!keyboardPlayback) await page.locator("#play").click();
    const beforeSeek = await page.evaluate(
      () => document.querySelector("#audio").currentTime,
    );
    const seekRangeSupported = await page.evaluate(async () => {
      const response = await fetch(
        document.querySelector("#audio").currentSrc,
        {
          method: "HEAD",
        },
      );
      return response.headers.get("accept-ranges") === "bytes";
    });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    const afterSeek = await page.evaluate(
      () => document.querySelector("#audio").currentTime,
    );
    await page.waitForTimeout(durationMs);
    const result = await snapshot(page);
    const nonblank = await canvasIsNonblank(page);
    await page.keyboard.press("Space");
    if (await page.evaluate(() => !document.querySelector("#audio").paused)) {
      await page.locator("#play").click();
    }
    return {
      available: result.animated ? result.running : keyboardPlayback,
      keyboardPlayback,
      keyboardSeek: {
        passed: seekRangeSupported ? afterSeek >= beforeSeek + 4 : null,
        rangeSupported: seekRangeSupported,
        attemptedDeltaSeconds: Math.round((afterSeek - beforeSeek) * 100) / 100,
      },
      nonblank,
      ...result,
    };
  } catch (error) {
    return { available: false, error: String(error) };
  }
}

async function validateHiddenState(page) {
  const session = await page.context().newCDPSession(page);
  try {
    await page.evaluate(() => {
      window.visualizerShowcase.benchmark.setInput({ type: "tempo", bpm: 120 });
      window.visualizerShowcase.benchmark.start();
    });
    await session.send("Emulation.setPageVisibilityOverride", {
      visibilityState: "hidden",
    });
    await page.waitForTimeout(250);
    const result = await snapshot(page);
    await session.send("Emulation.setPageVisibilityOverride", {
      visibilityState: "visible",
    });
    await page.evaluate(() => window.visualizerShowcase.benchmark.stop());
    return {
      supported: true,
      passed: !result.running && result.stoppedReason === "hidden",
      snapshot: result,
    };
  } catch (error) {
    const coverPage = await page.context().newPage();
    try {
      await coverPage.goto("about:blank");
      await coverPage.bringToFront();
      await page.waitForTimeout(250);
      const result = await snapshot(page);
      await page.bringToFront();
      await page.evaluate(() => window.visualizerShowcase.benchmark.stop());
      return {
        supported: result.documentHidden,
        passed: result.documentHidden
          ? !result.running && result.stoppedReason === "hidden"
          : null,
        snapshot: result,
        note: result.documentHidden
          ? "Validated by moving the showcase behind a second browser page."
          : `Visibility automation unavailable: ${String(error)}`,
      };
    } finally {
      await coverPage.close();
    }
  } finally {
    await session.detach();
  }
}

async function validatePageSurface(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const api = window.visualizerShowcase;
    const beforeTheme = api.getTheme();
    api.setTheme({
      primary: "0 219 233",
      secondary: "255 186 32",
      shadow: "0 219 233",
      wave: "219 252 255",
    });
    const afterTheme = api.getTheme();
    const settings = api.setSettings(
      api.getMode(),
      { brightness: 105 },
      { persist: false },
    );
    return {
      noHorizontalOverflow: root.scrollWidth <= root.clientWidth + 1,
      nativeAudioVisible:
        document.querySelector("#audio").getClientRects().length > 0,
      localAudioPickerPresent:
        document.querySelector("#local-audio")?.type === "file",
      keyboardTargetsPresent:
        document.querySelectorAll("[data-mode], #local-audio, #play").length >=
        8,
      themeApiWorks:
        beforeTheme.primary === afterTheme.primary &&
        afterTheme.secondary === "255 186 32",
      settingsApiWorks: settings.brightness === 105,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  configuration: {
    baseUrl,
    durationMs,
    fpsCap,
    includeHolds,
    modes,
    viewports: VIEWPORTS,
  },
  telemetry: {
    inPage: "Frame intervals recorded by the showcase render lifecycle.",
    browserProcess:
      "Not collected by this runner. Use OS process counters separately on the target laptop.",
  },
  results: {},
  consoleErrors: [],
};

try {
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        report.consoleErrors.push({
          viewport: viewportName,
          text: message.text(),
        });
      }
    });
    await page.goto(showcaseUrl(viewportName), { waitUntil: "networkidle" });
    await waitForShowcase(page);
    report.results[viewportName] = {
      surface: await validatePageSurface(page),
      hidden: await validateHiddenState(page),
      modes: {},
    };

    for (const mode of modes) {
      await setModeAndPreset(page, mode);
      const tempo = {};
      for (const bpm of TEMPOS)
        tempo[bpm] = await runTempoSample(page, mode, bpm);
      report.results[viewportName].modes[mode] = {
        tempo,
        paused: await validateStoppedState(page, mode),
        reducedMotion: await validateReducedMotion(page, mode),
        singleLoop: await validateSingleLoop(page, mode),
        live:
          viewportName === "desktop" ? await runLiveSample(page, mode) : null,
      };
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const rows = [];
for (const [viewport, viewportResult] of Object.entries(report.results)) {
  for (const [mode, modeResult] of Object.entries(viewportResult.modes)) {
    const sample = modeResult.tempo[120];
    rows.push({
      viewport,
      mode,
      fps: sample.observedFps,
      animated: sample.animated,
      expectsNonblank: sample.expectsNonblank,
      p95Ms: sample.p95FrameIntervalMs,
      maxMs: sample.maxFrameIntervalMs,
      longFrameThresholdMs: sample.longFrameThresholdMs,
      longFrames: sample.longFrameCount,
      nonblank: sample.nonblank,
      paused: modeResult.paused.passed,
      reduced: modeResult.reducedMotion.passed,
      singleLoop: modeResult.singleLoop.passed,
    });
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.table(rows);
console.log(`Benchmark report: ${outputPath}`);

const failed = rows.some(
  (row) =>
    (row.expectsNonblank ? !row.nonblank : row.nonblank) ||
    !row.paused ||
    !row.reduced ||
    !row.singleLoop,
);
const surfaceFailed = Object.values(report.results).some((result) =>
  Object.values(result.surface).some((value) => value === false),
);
const liveFailed = Object.values(report.results.desktop.modes).some(
  (result) =>
    result.live?.available &&
    (!result.live.keyboardPlayback ||
      result.live.keyboardSeek.passed === false),
);
if (failed || surfaceFailed || liveFailed || report.consoleErrors.length > 0)
  process.exitCode = 1;
