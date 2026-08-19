import { CaptureSession } from "./capture-session.mjs";
import {
  MESSAGE_TARGET,
  MESSAGE_TYPE,
  publicErrorMessage,
} from "./protocol.mjs";

let operation = Promise.resolve();

const session = new CaptureSession({
  createAudioContext: () =>
    new globalThis.AudioContext({ latencyHint: "interactive" }),
  createWorkletNode: (context) =>
    new globalThis.AudioWorkletNode(context, "mistake-watch-pcm-probe", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    }),
  getUserMedia: (constraints) =>
    globalThis.navigator.mediaDevices.getUserMedia(constraints),
  onStateChange: (status) => {
    void notifyWorker(status);
  },
  workletModuleUrl: globalThis.chrome.runtime.getURL("pcm-probe-worklet.js"),
});

globalThis.chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message?.target !== MESSAGE_TARGET.offscreen) {
      return false;
    }

    operation = operation
      .catch(() => undefined)
      .then(() => handleMessage(message));
    operation
      .then((status) => sendResponse({ ok: true, status }))
      .catch((error) =>
        sendResponse({ ok: false, error: publicErrorMessage(error) }),
      );
    return true;
  },
);

globalThis.addEventListener("pagehide", () => {
  void session.stop("offscreen-unloaded");
});

async function handleMessage(message) {
  switch (message.type) {
    case MESSAGE_TYPE.getStatus:
      return session.getStatus();
    case MESSAGE_TYPE.startCapture:
      return session.start(message.data ?? {});
    case MESSAGE_TYPE.stopCapture:
      return session.stop(message.reason);
    default:
      throw new Error("Unsupported offscreen command.");
  }
}

async function notifyWorker(status) {
  try {
    await globalThis.chrome.runtime.sendMessage({
      target: MESSAGE_TARGET.worker,
      type: MESSAGE_TYPE.captureState,
      status,
    });
  } catch {
    // The service worker may be suspended between state transitions.
  }
}
