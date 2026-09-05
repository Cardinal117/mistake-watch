import { createServer } from "node:http";
import process from "node:process";

import { chromium } from "@playwright/test";

const mediaBytes = createWavFixture(240);
const responseChunkBytes = 64 * 1024;
const requestLog = [];
const sessionIds = ["session-a", "session-b"];

const server = createServer((request, response) => {
  const host = request.headers.host ?? "";
  const requestUrl = new URL(request.url ?? "/", `http://${host}`);
  const runId = requestUrl.searchParams.get("run") ?? "unknown";

  if (
    host.startsWith("watch.localhost:") &&
    requestUrl.pathname === "/fixture"
  ) {
    const cookies = sessionIds.map(
      (sessionId) =>
        `mw_media_access=${sessionId}-${runId}; Domain=watch.localhost; ` +
        `Path=/room-sessions/${sessionId}/; HttpOnly; SameSite=Strict`,
    );

    response.writeHead(200, {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": cookies,
    });
    response.end(`<!doctype html>
<html lang="en">
  <body>
    ${sessionIds
      .map(
        (sessionId) =>
          `<audio id="${sessionId}" preload="auto" src="${mediaOrigin()}/room-sessions/${sessionId}/content?run=${escapeHtml(runId)}"></audio>`,
      )
      .join("\n")}
  </body>
</html>`);
    return;
  }

  const sessionMatch = /^\/room-sessions\/(session-[ab])\/content$/.exec(
    requestUrl.pathname,
  );

  if (host.startsWith("media.watch.localhost:") && sessionMatch) {
    const sessionId = sessionMatch[1];
    const expectedCookie = `mw_media_access=${sessionId}-${runId}`;
    const cookiePresent = (request.headers.cookie ?? "")
      .split(/;\s*/)
      .includes(expectedCookie);
    const range = parseRange(request.headers.range, mediaBytes.length);

    if (!cookiePresent) {
      requestLog.push({
        cookiePresent,
        kind: "media",
        range: request.headers.range ?? null,
        runId,
        sessionId,
        status: 403,
      });
      response.writeHead(403, { "Cache-Control": "private, no-store" });
      response.end("Missing scoped media credential");
      return;
    }

    if (request.headers.range && !range) {
      requestLog.push({
        cookiePresent,
        kind: "media",
        range: request.headers.range,
        runId,
        sessionId,
        status: 416,
      });
      response.writeHead(416, {
        "Content-Range": `bytes */${mediaBytes.length}`,
      });
      response.end();
      return;
    }

    const start = range?.start ?? 0;
    const requestedEnd = range?.end ?? mediaBytes.length - 1;
    const end = Math.min(
      requestedEnd,
      start + responseChunkBytes - 1,
      mediaBytes.length - 1,
    );

    if (start >= mediaBytes.length || end < start) {
      requestLog.push({
        cookiePresent,
        kind: "media",
        range: request.headers.range ?? null,
        runId,
        sessionId,
        status: 416,
      });
      response.writeHead(416, {
        "Content-Range": `bytes */${mediaBytes.length}`,
      });
      response.end();
      return;
    }

    const status = request.headers.range ? 206 : 200;
    const headers = {
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": appOrigin(),
      "Cache-Control": "private, no-store",
      "Content-Length": String(end - start + 1),
      "Content-Type": "audio/wav",
    };

    if (status === 206) {
      headers["Content-Range"] = `bytes ${start}-${end}/${mediaBytes.length}`;
    }

    requestLog.push({
      cookiePresent,
      kind: "media",
      range: request.headers.range ?? null,
      runId,
      sessionId,
      status,
    });
    response.writeHead(status, headers);
    response.end(mediaBytes.subarray(start, end + 1));
    return;
  }

  response.writeHead(404);
  response.end();
});

await listen(server);
const address = server.address();

if (!address || typeof address === "string") {
  throw new Error("TASK-024 fixture server did not expose a TCP port.");
}

const port = address.port;
const operaPath =
  process.env.TASK024_OPERA_PATH ??
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

console.log(JSON.stringify({ results }, null, 2));

if (results.some((result) => !result.passed)) {
  console.error(
    "TASK-024 BLOCKED: A supported browser did not preserve the scoped media credential on stable Range requests.",
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
    await page.goto(`${appOrigin()}/fixture?run=${encodeURIComponent(runId)}`);

    for (const sessionId of sessionIds) {
      const locator = page.locator(`#${sessionId}`);
      await locator.evaluate((media) => {
        if (!(media instanceof HTMLMediaElement)) {
          throw new Error("Fixture media element is missing.");
        }

        media.load();
      });
      await page.waitForFunction((id) => {
        const media = document.querySelector(`#${id}`);
        return (
          media instanceof HTMLMediaElement &&
          Number.isFinite(media.duration) &&
          media.duration > 0
        );
      }, sessionId);
      await locator.evaluate(async (media) => {
        try {
          await media.play();
        } catch {
          // Explicit seeking below still proves the credential and Range path.
        }
      });
      await page.waitForTimeout(400);
      await locator.evaluate((media) => {
        media.currentTime = Math.max(1, media.duration * 0.75);
      });
      await page.waitForTimeout(1_000);
    }

    const requests = requestLog.filter((entry) => entry.runId === runId);
    const sessionResults = sessionIds.map((sessionId) => {
      const sessionRequests = requests.filter(
        (entry) => entry.sessionId === sessionId,
      );

      return {
        allCredentialsPresent:
          sessionRequests.length > 0 &&
          sessionRequests.every((entry) => entry.cookiePresent),
        ranges: sessionRequests.map((entry) => entry.range),
        requestCount: sessionRequests.length,
        sessionId,
        statuses: sessionRequests.map((entry) => entry.status),
      };
    });
    const passed = sessionResults.every(
      (result) =>
        result.allCredentialsPresent &&
        result.requestCount >= 2 &&
        result.statuses.every((status) => status === 200 || status === 206),
    );

    await context.close();

    return { browserVersion, label, passed, sessionResults };
  } finally {
    await browser.close();
  }
}

function appOrigin() {
  return `http://watch.localhost:${port}`;
}

function mediaOrigin() {
  return `http://media.watch.localhost:${port}`;
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

function createWavFixture(durationSeconds) {
  const channelCount = 1;
  const sampleRate = 8_000;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = durationSeconds * sampleRate * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
  buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let offset = 44; offset < buffer.length; offset += 2) {
    const sampleIndex = (offset - 44) / 2;
    const sample = Math.round(
      Math.sin((sampleIndex / sampleRate) * Math.PI * 2 * 220) * 4_000,
    );
    buffer.writeInt16LE(sample, offset);
  }

  return buffer;
}
