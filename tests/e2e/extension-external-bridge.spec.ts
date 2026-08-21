import { chromium, expect, test } from "@playwright/test";
import { resolve } from "node:path";

const extensionId = "gjhgbhjblbbpcpallbnpakijoheemgdb";
const extensionRoot = resolve("extensions/watch-audio-companion");

test("approved room page reaches the private extension bridge", async ({}, testInfo) => {
  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("profile"),
    {
      args: [
        `--disable-extensions-except=${extensionRoot}`,
        `--load-extension=${extensionRoot}`,
      ],
      headless: false,
    },
  );

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto("http://127.0.0.1:5371/rooms/bridge-proof", {
      waitUntil: "domcontentloaded",
    });

    const result = await page.evaluate(async (knownExtensionId) => {
      type ExternalPort = {
        disconnect(): void;
        onDisconnect: { addListener(listener: () => void): void };
        onMessage: { addListener(listener: (message: unknown) => void): void };
      };
      const runtime = (
        globalThis as typeof globalThis & {
          chrome?: {
            runtime?: {
              connect(
                extensionId: string,
                options: { name: string },
              ): ExternalPort;
            };
          };
        }
      ).chrome?.runtime;
      if (!runtime?.connect) return { state: "runtime-unavailable" };

      return new Promise<{ active?: boolean; state: string }>(
        (resolveResult) => {
          const port = runtime.connect(knownExtensionId, {
            name: "mistake-watch-audio-v1",
          });
          const timer = globalThis.setTimeout(
            () => resolveResult({ state: "timeout" }),
            3_000,
          );
          port.onMessage.addListener((message) => {
            const envelope = message as {
              status?: { active?: boolean };
              type?: string;
            };
            if (envelope.type !== "capture-state") return;
            globalThis.clearTimeout(timer);
            resolveResult({
              active: envelope.status?.active,
              state: "connected",
            });
            port.disconnect();
          });
          port.onDisconnect.addListener(() => {
            globalThis.clearTimeout(timer);
            resolveResult({ state: "disconnected" });
          });
        },
      );
    }, extensionId);

    expect(result).toEqual({ active: false, state: "connected" });
  } finally {
    await context.close();
  }
});
