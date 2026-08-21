import { expect, test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";

const extensionRoot = resolve("extensions/watch-audio-companion");
let server: Server;
let visualizerUrl: string;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const relativePath = normalize(pathname).replace(/^[/\\]+/, "");
    const filePath = resolve(join(extensionRoot, relativePath));
    const rootRelativePath = relative(extensionRoot, filePath);

    if (rootRelativePath.startsWith("..") || isAbsolute(rootRelativePath)) {
      response.writeHead(403).end();
      return;
    }

    try {
      const body = await readFile(filePath);
      response.writeHead(200, { "content-type": contentType(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Visualizer test server did not expose a TCP port.");
  }
  visualizerUrl = `http://127.0.0.1:${address.port}/visualizer.html`;
});

test.afterAll(async () => {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
});

test("Rhythm Lab starts with the real default renderer and switches modes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${visualizerUrl}?input=fixture&mode=dot-waves&fps=24`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dot Waves");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("#status")).toHaveText("120 BPM fixture");

  const modes = [
    ["spectrum", "Mirror Spectrum"],
    ["ribbon", "Siri Ribbon"],
    ["dot-waves", "Dot Waves"],
    ["signal-bloom", "Signal Bloom"],
    ["constellation", "Constellation"],
    ["spectrum", "Mirror Spectrum"],
  ] as const;

  for (const [value, title] of modes) {
    await page.getByLabel("Visualizer").selectOption(value);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }

  expect(errors).toEqual([]);
});

function contentType(filePath: string) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
