import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

const rootDir = process.cwd();
const mediaPath = path.join(
  rootDir,
  "docs/reviews/audio-visualizer-showcase/assets/ezios-family.mp3",
);
const mediaBytes = await readFile(mediaPath);
const leaseDurationMs = 1_200;
const responseChunkBytes = 64 * 1024;
const responseDelayMs = 125;
const requestLog = [];

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const runId = requestUrl.searchParams.get("run") ?? "unknown";

  if (requestUrl.pathname === "/fixture") {
    response.writeHead(200, {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(`<!doctype html>
<html lang="en">
  <body>
    <audio id="media" preload="auto"></audio>
    <script>
      const media = document.querySelector("#media");
      window.mediaEvents = [];
      for (const name of ["canplay", "durationchange", "error", "loadedmetadata", "playing", "seeked", "seeking", "stalled", "suspend", "waiting"]) {
        media.addEventListener(name, () => {
          window.mediaEvents.push({
            at: Date.now(),
            currentTime: media.currentTime,
            errorCode: media.error?.code ?? null,
            name,
            networkState: media.networkState,
            readyState: media.readyState,
          });
        });
      }
      media.src = "/stable?run=${escapeHtml(runId)}";
      media.load();
    </script>
  </body>
</html>`);
    return;
  }

  if (requestUrl.pathname === "/stable") {
    const expiresAt = Date.now() + leaseDurationMs;
    requestLog.push({
      at: Date.now(),
      expiresAt,
      kind: "stable",
      range: request.headers.range ?? null,
      runId,
      status: 307,
    });
    const location = `/object?run=${encodeURIComponent(runId)}&expiresAt=${expiresAt}`;
    response.writeHead(307, {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Expires: "0",
      Location: location,
      Pragma: "no-cache",
      Vary: "Cookie, Range",
    });
    response.end();
    return;
  }

  if (requestUrl.pathname === "/object") {
    const expiresAt = Number(requestUrl.searchParams.get("expiresAt"));
    const requestStartedAt = Date.now();
    const expired =
      !Number.isFinite(expiresAt) || requestStartedAt >= expiresAt;

    if (expired) {
      requestLog.push({
        at: requestStartedAt,
        expiresAt,
        kind: "object",
        range: request.headers.range ?? null,
        runId,
        status: 403,
      });
      response.writeHead(403, {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("Expired object authorization");
      return;
    }

    const requestedRange = parseRange(request.headers.range, mediaBytes.length);
    const start = requestedRange?.start ?? 0;
    const requestedEnd = requestedRange?.end ?? mediaBytes.length - 1;
    const end = Math.min(
      requestedEnd,
      start + responseChunkBytes - 1,
      mediaBytes.length - 1,
    );

    if (start >= mediaBytes.length || end < start) {
      requestLog.push({
        at: requestStartedAt,
        expiresAt,
        kind: "object",
        range: request.headers.range ?? null,
        runId,
        status: 416,
      });
      response.writeHead(416, {
        "Content-Range": `bytes */${mediaBytes.length}`,
      });
      response.end();
      return;
    }

    requestLog.push({
      at: requestStartedAt,
      expiresAt,
      kind: "object",
      range: request.headers.range ?? null,
      runId,
      status: 206,
    });

    setTimeout(() => {
      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${mediaBytes.length}`,
        "Content-Type": "audio/mpeg",
        Expires: "0",
        Pragma: "no-cache",
      });
      response.end(mediaBytes.subarray(start, end + 1));
    }, responseDelayMs);
    return;
  }

  response.writeHead(404);
  response.end();
});

await listen(server);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("TASK-023 fixture server did not expose a TCP port.");
}

const baseUrl = `http://127.0.0.1:${address.port}`;
const operaPath =
  process.env.TASK023_OPERA_PATH ??
  "C:\\Users\\Admin\\AppData\\Local\\Programs\\Opera GX\\opera.exe";
const browsers = [
  { executablePath: undefined, label: "playwright-chromium" },
  { executablePath: operaPath, label: "opera-gx" },
];
const results = [];

try {
  for (const browserTarget of browsers) {
    results.push(await verifyBrowser(browserTarget));
  }
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

console.log(JSON.stringify({ leaseDurationMs, results }, null, 2));

if (results.some((result) => !result.passed)) {
  console.error(
    "TASK-023 RED: Candidate A did not reliably revisit the stable route after expiry.",
  );
  process.exitCode = 1;
}

async function verifyBrowser({ executablePath, label }) {
  const runId = `${label}-${Date.now()}`;
  const browser = await chromium.launch({
    args: ["--autoplay-policy=no-user-gesture-required"],
    executablePath,
    headless: true,
  });

  try {
    const browserVersion = browser.version();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseUrl}/fixture?run=${encodeURIComponent(runId)}`);
    await page.waitForFunction(() => {
      const media = document.querySelector("#media");
      return (
        media instanceof HTMLMediaElement &&
        Number.isFinite(media.duration) &&
        media.duration > 0
      );
    });

    const initialState = await page.locator("#media").evaluate((media) => ({
      buffered: Array.from({ length: media.buffered.length }, (_, index) => ({
        end: media.buffered.end(index),
        start: media.buffered.start(index),
      })),
      currentSrc: media.currentSrc,
      duration: media.duration,
    }));

    await page.locator("#media").evaluate(async (media) => {
      try {
        await media.play();
      } catch {
        // Playback is not required to prove redirect renewal on an explicit seek.
      }
    });
    await page.waitForTimeout(leaseDurationMs + 500);

    const seekStartedAt = Date.now();
    const seekTarget = Math.max(1, initialState.duration * 0.82);
    await page.locator("#media").evaluate((media, target) => {
      media.currentTime = target;
    }, seekTarget);
    await page.waitForTimeout(3_000);

    const events = await page.evaluate(() => window.mediaEvents ?? []);
    const requests = requestLog.filter((entry) => entry.runId === runId);
    const firstStableRequest = requests.find(
      (entry) => entry.kind === "stable",
    );
    const afterExpiryStableRequests = requests.filter(
      (entry) =>
        entry.kind === "stable" &&
        firstStableRequest &&
        entry.at >= firstStableRequest.expiresAt,
    );
    const expiredObjectRequests = requests.filter(
      (entry) => entry.kind === "object" && entry.status === 403,
    );
    const passed =
      afterExpiryStableRequests.length > 0 &&
      expiredObjectRequests.length === 0;

    await context.close();

    return {
      afterExpiryStableRequests,
      browserVersion,
      candidateVerdict: passed
        ? "stable-route-revisited"
        : "redirect-target-reused-after-expiry",
      events,
      expiredObjectRequests,
      initialState,
      label,
      passed,
      requests,
      seekStartedAt,
      seekTarget,
    };
  } finally {
    await browser.close();
  }
}

function parseRange(value, totalLength) {
  if (!value) {
    return null;
  }

  const match = /^bytes=(\d+)-(\d*)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : totalLength - 1;

  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    return null;
  }

  return { end, start };
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function listen(httpServer) {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });
}
