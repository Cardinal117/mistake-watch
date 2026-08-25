import {
  MESSAGE_TARGET,
  MESSAGE_TYPE,
  isAllowedWatchUrl,
  publicErrorMessage,
} from "./protocol.mjs";
import { createExternalBridgeController } from "./external-bridge.mjs";

const OFFSCREEN_DOCUMENT = "offscreen.html";
const VISUALIZER_DOCUMENT = "visualizer.html";
const badge = Object.freeze({
  active: { color: "#feb700", text: "ON", title: "Audio capture active" },
  error: { color: "#93000a", text: "ERR", title: "Audio capture failed" },
  idle: {
    color: "#3b494b",
    text: "",
    title: "Enable Mistake Watch audio capture",
  },
  signal: { color: "#00dbe9", text: "PCM", title: "Audio signal confirmed" },
  starting: { color: "#006970", text: "...", title: "Starting audio capture" },
});

let creatingOffscreenDocument = null;
let bridgeVisualForwardingOperation = Promise.resolve();
const externalBridge = createExternalBridgeController({
  getStatus,
  onVisualDemandChange: (enabled) => {
    bridgeVisualForwardingOperation = bridgeVisualForwardingOperation
      .catch(() => undefined)
      .then(() => setBridgeVisualForwarding(enabled));
  },
});

globalThis.chrome.action.onClicked.addListener((tab) => {
  void toggleCapture(tab);
});

globalThis.chrome.runtime.onInstalled.addListener(() => {
  void setBadge("idle");
});

globalThis.chrome.runtime.onStartup.addListener(() => {
  void setBadge("idle");
});

globalThis.chrome.runtime.onConnectExternal.addListener((port) => {
  void externalBridge.connect(port);
});

globalThis.chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message?.target !== MESSAGE_TARGET.worker) {
      return false;
    }

    if (message.type === MESSAGE_TYPE.captureState) {
      externalBridge.publishStatus(message.status);
      void updateBadgeFromStatus(message.status);
      return false;
    }

    if (message.type === MESSAGE_TYPE.rhythmFrame) {
      externalBridge.publishRhythmFrame(message.frame);
      return false;
    }

    if (message.type === MESSAGE_TYPE.visualFrame) {
      externalBridge.publishVisualFrame(message.frame);
      return false;
    }

    if (message.type === MESSAGE_TYPE.stopCapture) {
      stopCapture("visualizer-stopped")
        .then(() => sendResponse({ ok: true }))
        .catch((error) =>
          sendResponse({ ok: false, error: publicErrorMessage(error) }),
        );
      return true;
    }

    return false;
  },
);

globalThis.chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    externalBridge.disconnectTab(tabId);
    void stopIfCapturedTab(tabId, "tab-navigated");
  }
});

globalThis.chrome.tabs.onRemoved.addListener((tabId) => {
  externalBridge.disconnectTab(tabId);
  void stopIfCapturedTab(tabId, "tab-closed");
});

globalThis.chrome.tabCapture.onStatusChanged.addListener((captureInfo) => {
  if (captureInfo.status === "error" || captureInfo.status === "stopped") {
    void stopIfCapturedTab(captureInfo.tabId, `capture-${captureInfo.status}`);
  }
});

async function toggleCapture(tab) {
  try {
    if (!Number.isInteger(tab.id) || !isAllowedWatchUrl(tab.url)) {
      throw new Error("Open a Mistake Watch tab before enabling capture.");
    }

    await ensureOffscreenDocument();
    const current = await getStatus();

    if (current.active) {
      await stopCapture("user-stopped");
      return;
    }

    await setBadge("starting");
    const streamId = await globalThis.chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });
    const response = await sendToOffscreen({
      data: { streamId, tabId: tab.id },
      target: MESSAGE_TARGET.offscreen,
      type: MESSAGE_TYPE.startCapture,
    });

    assertSuccessfulResponse(response);
    await updateBadgeFromStatus(response.status);
    await openVisualizerLab();
  } catch (error) {
    await recoverFromToggleError(error);
  }
}

async function recoverFromToggleError(error) {
  console.error("Mistake Watch audio capture failed:", error);

  if (await hasOffscreenDocument()) {
    try {
      const status = await getStatus();
      if (status.active || status.phase === "starting") {
        await updateBadgeFromStatus(status);
        return;
      }
    } catch (statusError) {
      console.warn(
        "Mistake Watch capture status recovery failed:",
        statusError,
      );
    }

    await closeOffscreenDocument();
  }

  await setBadge("error", publicErrorMessage(error));
}

async function stopIfCapturedTab(tabId, reason) {
  try {
    if (!(await hasOffscreenDocument())) {
      return;
    }

    const status = await getStatus();
    if (status.active && status.tabId === tabId) {
      await stopCapture(reason);
    }
  } catch (error) {
    if (isMissingOffscreenReceiverError(error)) {
      await closeOffscreenDocument();
      await setBadge("idle");
      return;
    }

    console.warn("Mistake Watch capture cleanup failed:", error);
  }
}

async function stopCapture(reason) {
  if (await hasOffscreenDocument()) {
    const response = await sendToOffscreen({
      reason,
      target: MESSAGE_TARGET.offscreen,
      type: MESSAGE_TYPE.stopCapture,
    });
    assertSuccessfulResponse(response);
  }

  await closeOffscreenDocument();
  await setBadge("idle");
}

async function getStatus() {
  const response = await sendToOffscreen({
    target: MESSAGE_TARGET.offscreen,
    type: MESSAGE_TYPE.getStatus,
  });
  assertSuccessfulResponse(response);
  return response.status;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = globalThis.chrome.offscreen.createDocument({
      justification: "Route and inspect user-approved Mistake Watch tab audio",
      reasons: ["USER_MEDIA"],
      url: OFFSCREEN_DOCUMENT,
    });
  }

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

async function closeOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    await globalThis.chrome.offscreen.closeDocument();
  }
}

async function openVisualizerLab() {
  const documentUrl = globalThis.chrome.runtime.getURL(VISUALIZER_DOCUMENT);

  if (typeof globalThis.chrome.runtime.getContexts === "function") {
    try {
      const contexts = await globalThis.chrome.runtime.getContexts({
        contextTypes: ["TAB"],
        documentUrls: [documentUrl],
      });
      const existingTabId = contexts.find((context) =>
        Number.isInteger(context.tabId),
      )?.tabId;

      if (Number.isInteger(existingTabId)) {
        await globalThis.chrome.tabs.update(existingTabId, { active: true });
        return;
      }
    } catch {
      // Opera may expose getContexts without supporting every context filter.
    }
  }

  await globalThis.chrome.tabs.create({ url: documentUrl });
}

async function hasOffscreenDocument() {
  const documentUrl = globalThis.chrome.runtime.getURL(OFFSCREEN_DOCUMENT);

  if (typeof globalThis.chrome.runtime.getContexts === "function") {
    const contexts = await globalThis.chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [documentUrl],
    });
    return contexts.length > 0;
  }

  const clients = await globalThis.clients.matchAll();
  return clients.some((client) => client.url === documentUrl);
}

async function sendToOffscreen(message) {
  return globalThis.chrome.runtime.sendMessage(message);
}

async function setBridgeVisualForwarding(enabled) {
  try {
    if (!(await hasOffscreenDocument())) return;
    await sendToOffscreen({
      enabled,
      target: MESSAGE_TARGET.offscreen,
      type: MESSAGE_TYPE.bridgeVisuals,
    });
  } catch (error) {
    if (!isMissingOffscreenReceiverError(error)) {
      console.warn("Mistake Watch bridge visual routing failed:", error);
    }
  }
}

function assertSuccessfulResponse(response) {
  if (!response?.ok) {
    throw new Error(response?.error || "The offscreen capture command failed.");
  }
}

function isMissingOffscreenReceiverError(error) {
  return /Could not establish connection\. Receiving end does not exist\.?$/.test(
    error instanceof Error ? error.message : String(error),
  );
}

async function updateBadgeFromStatus(status) {
  if (status?.phase === "starting") {
    await setBadge("starting");
  } else if (!status?.active) {
    await setBadge("idle");
  } else if (status.hasSignal) {
    await setBadge("signal", formatRhythmDetail(status.rhythm));
  } else {
    await setBadge("active");
  }
}

function formatRhythmDetail(rhythm) {
  if (!rhythm || rhythm.bpm === null) {
    return undefined;
  }

  return `${rhythm.bpm.toFixed(1)} BPM, ${Math.round(
    rhythm.confidence * 100,
  )}% confidence`;
}

async function setBadge(state, detail) {
  const presentation = badge[state];
  await Promise.all([
    globalThis.chrome.action.setBadgeBackgroundColor({
      color: presentation.color,
    }),
    globalThis.chrome.action.setBadgeText({ text: presentation.text }),
    globalThis.chrome.action.setTitle({
      title: detail ? `${presentation.title}: ${detail}` : presentation.title,
    }),
  ]);
}
