import assert from "node:assert/strict";
import test from "node:test";

test("service worker treats a missing teardown receiver as idle but reports unexpected failures", async () => {
  const harness = createServiceWorkerHarness();
  const originalChrome = globalThis.chrome;
  const originalClients = globalThis.clients;
  const originalWarn = console.warn;

  globalThis.chrome = harness.chrome;
  globalThis.clients = { matchAll: async () => [] };
  console.warn = (...args) => harness.recordWarning(args);

  try {
    const workerUrl = new URL(
      "../../extensions/watch-audio-companion/service-worker.mjs",
      import.meta.url,
    );
    workerUrl.searchParams.set("test", `${Date.now()}-${Math.random()}`);
    await import(workerUrl.href);

    harness.setRuntimeError(
      new Error(
        "Could not establish connection. Receiving end does not exist.",
      ),
    );
    await harness.removeCapturedTab(42);

    assert.deepEqual(harness.warnings, []);
    assert.equal(harness.badgeTexts.at(-1), "");

    harness.resetObservations();
    harness.setRuntimeError(new Error("Unexpected runtime failure"));
    await harness.removeCapturedTab(42);

    assert.equal(harness.warnings.length, 1);
    assert.match(String(harness.warnings[0][1]), /Unexpected runtime failure/);
  } finally {
    console.warn = originalWarn;
    if (originalChrome === undefined) {
      delete globalThis.chrome;
    } else {
      globalThis.chrome = originalChrome;
    }
    if (originalClients === undefined) {
      delete globalThis.clients;
    } else {
      globalThis.clients = originalClients;
    }
  }
});

function createServiceWorkerHarness() {
  const listeners = {
    tabRemoved: null,
  };
  const state = {
    runtimeError: null,
    terminal: null,
  };
  const badgeTexts = [];
  const warnings = [];

  const chrome = {
    action: {
      onClicked: createEvent(),
      setBadgeBackgroundColor: async () => {},
      setBadgeText: async ({ text }) => {
        badgeTexts.push(text);
        if (text === "") {
          state.terminal?.();
        }
      },
      setTitle: async () => {},
    },
    offscreen: {
      closeDocument: async () => {},
      createDocument: async () => {},
    },
    runtime: {
      getContexts: async () => [{ contextType: "OFFSCREEN_DOCUMENT" }],
      getURL: (path) => `chrome-extension://test/${path}`,
      onInstalled: createEvent(),
      onMessage: createEvent(),
      onStartup: createEvent(),
      sendMessage: async () => {
        throw state.runtimeError;
      },
    },
    tabCapture: {
      getMediaStreamId: async () => "stream-id",
      onStatusChanged: createEvent(),
    },
    tabs: {
      create: async () => {},
      onRemoved: createEvent((listener) => {
        listeners.tabRemoved = listener;
      }),
      onUpdated: createEvent(),
      update: async () => {},
    },
  };

  return {
    badgeTexts,
    chrome,
    recordWarning(args) {
      warnings.push(args);
      state.terminal?.();
    },
    async removeCapturedTab(tabId) {
      assert.equal(typeof listeners.tabRemoved, "function");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Cleanup did not reach a terminal state.")),
          1_000,
        );
        state.terminal = () => {
          clearTimeout(timeout);
          resolve();
        };
        listeners.tabRemoved(tabId);
      });
      state.terminal = null;
    },
    resetObservations() {
      badgeTexts.length = 0;
      warnings.length = 0;
    },
    setRuntimeError(error) {
      state.runtimeError = error;
    },
    warnings,
  };
}

function createEvent(onAdd) {
  return {
    addListener(listener) {
      onAdd?.(listener);
    },
  };
}
