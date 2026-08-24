import { normalizeRhythmFrameV1 } from "./rhythm-contract.mjs";
import { normalizeVisualFrameV1 } from "./visual-frame-contract.mjs";

export const EXTERNAL_BRIDGE_NAME = "mistake-watch-audio-v1";
export const EXTERNAL_BRIDGE_VERSION = 1;

export const EXTERNAL_MESSAGE_TYPE = Object.freeze({
  captureState: "capture-state",
  rhythmFrame: "rhythm-frame",
  visualAck: "visual-ack",
  visualFrame: "visual-frame",
});

const ACK_TIMEOUT_MS = 1_000;
const allowedOrigins = new Set([
  "https://watch.mistakestudios.com",
  "https://mistake-watch.vercel.app",
  "http://127.0.0.1:5371",
  "http://localhost:5371",
]);

export function createExternalBridgeController({
  clearTimeout: clearScheduledTimeout = (timer) =>
    globalThis.clearTimeout(timer),
  getStatus,
  onVisualDemandChange = () => {},
  setTimeout: scheduleTimeout = (callback, delay) =>
    globalThis.setTimeout(callback, delay),
}) {
  const records = new Map();
  let visualDemand = false;

  function updateVisualDemand() {
    const next = [...records.values()].some((record) => record.authorized);
    if (next === visualDemand) return;
    visualDemand = next;
    onVisualDemandChange(next);
  }

  function clearVisualState(record) {
    if (record.ackTimer !== null) clearScheduledTimeout(record.ackTimer);
    record.ackTimer = null;
    record.pendingVisualFrame = null;
    record.visualSequence = null;
  }

  function removeRecord(record) {
    if (records.get(record.tabId) === record) records.delete(record.tabId);
    clearVisualState(record);
    record.port.onDisconnect.removeListener(record.handleDisconnect);
    record.port.onMessage.removeListener(record.handleMessage);
    updateVisualDemand();
  }

  function createRecord(port, tabId) {
    const record = {
      ackTimer: null,
      authorized: false,
      disconnected: false,
      handleDisconnect: null,
      handleMessage: null,
      pendingVisualFrame: null,
      port,
      statusRevision: 0,
      tabId,
      visualSequence: null,
    };
    record.handleDisconnect = () => {
      record.disconnected = true;
      removeRecord(record);
    };
    record.handleMessage = (message) => {
      if (
        message?.version !== EXTERNAL_BRIDGE_VERSION ||
        message.type !== EXTERNAL_MESSAGE_TYPE.visualAck ||
        !Number.isInteger(message.sequence) ||
        message.sequence !== record.visualSequence
      ) {
        return;
      }
      releaseAcknowledgedFrame(record);
    };
    port.onDisconnect.addListener(record.handleDisconnect);
    port.onMessage.addListener(record.handleMessage);
    return record;
  }

  function applyStatus(record, status) {
    record.statusRevision += 1;
    const authorized = status?.active === true && status.tabId === record.tabId;
    if (!authorized) {
      record.authorized = false;
      clearVisualState(record);
      postRecordSafely(record, createCaptureStateMessage(null));
      updateVisualDemand();
      return;
    }

    record.authorized = true;
    if (!postRecordSafely(record, createCaptureStateMessage(status))) return;
    const rhythm = normalizeRhythmFrameV1(status.rhythm);
    if (rhythm) {
      postRecordSafely(record, {
        frame: rhythm,
        type: EXTERNAL_MESSAGE_TYPE.rhythmFrame,
        version: EXTERNAL_BRIDGE_VERSION,
      });
    }
    updateVisualDemand();
  }

  function sendVisualFrame(record, frame) {
    if (!record.authorized || record.disconnected) return;
    record.visualSequence = frame.sequence;
    if (
      !postRecordSafely(record, {
        frame,
        type: EXTERNAL_MESSAGE_TYPE.visualFrame,
        version: EXTERNAL_BRIDGE_VERSION,
      })
    ) {
      return;
    }
    record.ackTimer = scheduleTimeout(() => {
      record.ackTimer = null;
      record.visualSequence = null;
      sendPendingFrame(record);
    }, ACK_TIMEOUT_MS);
  }

  function sendPendingFrame(record) {
    if (!record.pendingVisualFrame) return;
    const pending = record.pendingVisualFrame;
    record.pendingVisualFrame = null;
    sendVisualFrame(record, pending);
  }

  function releaseAcknowledgedFrame(record) {
    if (record.ackTimer !== null) {
      clearScheduledTimeout(record.ackTimer);
      record.ackTimer = null;
    }
    record.visualSequence = null;
    sendPendingFrame(record);
  }

  function postRecordSafely(record, message) {
    try {
      record.port.postMessage(message);
      return true;
    } catch {
      removeRecord(record);
      disconnectSafely(record.port);
      return false;
    }
  }

  return Object.freeze({
    async connect(port) {
      const sender = normalizeSender(port);
      if (!sender) {
        disconnectSafely(port);
        return;
      }

      const existing = records.get(sender.tabId);
      if (existing) {
        removeRecord(existing);
        disconnectSafely(existing.port);
      }
      const record = createRecord(port, sender.tabId);
      records.set(sender.tabId, record);

      // Establish the dormant bridge before optional offscreen status work.
      applyStatus(record, null);
      const initialStatusRevision = record.statusRevision;
      if (record.disconnected || records.get(sender.tabId) !== record) return;

      let status = null;
      try {
        status = await getStatus();
      } catch {
        // No offscreen document means capture is inactive, not unauthorized.
      }
      if (record.disconnected || records.get(sender.tabId) !== record) return;
      if (
        record.statusRevision === initialStatusRevision &&
        status?.active === true &&
        status.tabId === record.tabId
      ) {
        applyStatus(record, status);
      }
    },

    disconnectTab(tabId) {
      const record = records.get(tabId);
      if (!record) return;
      removeRecord(record);
      disconnectSafely(record.port);
    },

    publishStatus(status) {
      for (const record of records.values()) applyStatus(record, status);
    },

    publishVisualFrame(value) {
      const frame = normalizeVisualFrameV1(value);
      if (!frame) return;
      for (const record of records.values()) {
        if (!record.authorized) continue;
        if (record.visualSequence !== null) {
          record.pendingVisualFrame = frame;
        } else {
          sendVisualFrame(record, frame);
        }
      }
    },
  });
}

export function isAllowedExternalPageUrl(value) {
  try {
    const url = new URL(value);
    return allowedOrigins.has(url.origin) && url.pathname.startsWith("/rooms/");
  } catch {
    return false;
  }
}

function createCaptureStateMessage(status) {
  return {
    status: Object.freeze({
      active: status?.active === true,
      hasSignal: status?.hasSignal === true,
      phase: normalizePhase(status?.phase),
    }),
    type: EXTERNAL_MESSAGE_TYPE.captureState,
    version: EXTERNAL_BRIDGE_VERSION,
  };
}

function normalizeSender(port) {
  const tabId = port?.sender?.tab?.id;
  if (
    port?.name !== EXTERNAL_BRIDGE_NAME ||
    !Number.isInteger(tabId) ||
    port.sender.frameId !== 0 ||
    !isAllowedExternalPageUrl(port.sender.url)
  ) {
    return null;
  }
  return { tabId };
}

function normalizePhase(value) {
  return value === "active" || value === "starting" ? value : "idle";
}

function disconnectSafely(port) {
  try {
    port?.disconnect();
  } catch {
    // The browser may have already released the external page.
  }
}
