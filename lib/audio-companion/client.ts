export const AUDIO_COMPANION_EXTENSION_ID = "gjhgbhjblbbpcpallbnpakijoheemgdb";

const BRIDGE_NAME = "mistake-watch-audio-v1";
const BRIDGE_VERSION = 1;
const RHYTHM_STALE_AFTER_MS = 2_000;
const VISUAL_DETAIL_STALE_AFTER_MS = 700;
const LOCK_CONFIDENCE = 0.5;
const RECONNECT_DELAYS_MS = [250, 1_000, 5_000] as const;

export type AudioCompanionStatus =
  | "unavailable"
  | "inactive"
  | "detecting"
  | "locked"
  | "stale"
  | "disconnected";

export type RhythmFrameV1 = Readonly<{
  bass: number;
  beatIntervalSeconds: number | null;
  beatOffsetSeconds: number | null;
  bpm: number | null;
  confidence: number;
  energy: number;
  highs: number;
  mids: number;
  onset: number;
  sampledAtSeconds: number;
  sequence: number;
  version: 1;
}>;

export type VisualFrameV1 = Readonly<{
  sampledAtSeconds: number;
  sequence: number;
  spectrum: readonly number[];
  version: 1;
  waveform: readonly number[];
}>;

export type AudioCompanionSnapshot = Readonly<{
  hasVisualDetail: boolean;
  rhythm: RhythmFrameV1 | null;
  status: AudioCompanionStatus;
}>;

export type AudioCompanionClient = ReturnType<
  typeof createAudioCompanionClient
>;

type ListenerEvent<T extends (...args: never[]) => void> = {
  addListener(listener: T): void;
  removeListener(listener: T): void;
};

type ExternalPort = {
  disconnect(): void;
  onDisconnect: ListenerEvent<() => void>;
  onMessage: ListenerEvent<(message: unknown) => void>;
  postMessage(message: unknown): void;
};

type ExternalRuntime = {
  connect(extensionId: string, options: { name: string }): ExternalPort;
};

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

type ClientDependencies = {
  clearTimeout?: (timer: TimerHandle) => void;
  now?: () => number;
  runtime?: ExternalRuntime | null;
  setTimeout?: (callback: () => void, delay: number) => TimerHandle;
};

export function createAudioCompanionClient(
  dependencies: ClientDependencies = {},
) {
  const runtime = dependencies.runtime ?? getBrowserRuntime();
  const clearScheduledTimeout =
    dependencies.clearTimeout ?? ((timer) => globalThis.clearTimeout(timer));
  const scheduleTimeout =
    dependencies.setTimeout ??
    ((callback, delay) => globalThis.setTimeout(callback, delay));
  const now = dependencies.now ?? (() => Date.now());
  const stateListeners = new Set<() => void>();
  const visualListeners = new Set<(frame: VisualFrameV1) => void>();
  let port: ExternalPort | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: TimerHandle | null = null;
  let shouldStayConnected = false;
  let staleTimer: TimerHandle | null = null;
  let lastRhythmSequence = -1;
  let lastVisualFrameAt = 0;
  let lastVisualSequence = -1;
  let visualFreshnessTimer: TimerHandle | null = null;
  let snapshot: AudioCompanionSnapshot = Object.freeze({
    hasVisualDetail: false,
    rhythm: null,
    status: "unavailable",
  });

  const handleDisconnect = () => {
    releasePort(false);
    updateSnapshot("disconnected", null, false);
    scheduleReconnect();
  };
  const handleMessage = (message: unknown) => {
    const envelope = asRecord(message);
    if (envelope?.version !== BRIDGE_VERSION) {
      return;
    }

    if (envelope.type === "capture-state") {
      const status = asRecord(envelope.status);
      if (!status) return;
      reconnectAttempt = 0;
      if (status.active !== true) {
        clearStaleTimer();
        clearVisualFreshness();
        lastRhythmSequence = -1;
        updateSnapshot("inactive", null, false);
      } else if (status.hasSignal !== true) {
        clearStaleTimer();
        clearVisualFreshness();
        lastRhythmSequence = -1;
        updateSnapshot("detecting", null, false);
      } else if (snapshot.status !== "locked" && snapshot.status !== "stale") {
        updateSnapshot("detecting", snapshot.rhythm);
      }
      return;
    }

    if (envelope.type === "rhythm-frame") {
      const frame = normalizeRhythmFrame(envelope.frame);
      if (!frame || frame.sequence <= lastRhythmSequence) return;
      lastRhythmSequence = frame.sequence;
      scheduleStaleState();
      updateSnapshot(isLocked(frame) ? "locked" : "detecting", frame);
      return;
    }

    if (envelope.type === "visual-frame") {
      const frame = normalizeVisualFrame(envelope.frame);
      if (!frame || frame.sequence <= lastVisualSequence || !port) return;
      lastVisualSequence = frame.sequence;
      lastVisualFrameAt = now();
      scheduleVisualFreshnessCheck();
      if (!snapshot.hasVisualDetail) {
        updateSnapshot(snapshot.status, snapshot.rhythm, true);
      }
      if (snapshot.status === "locked") scheduleStaleState();
      for (const listener of visualListeners) {
        try {
          listener(frame);
        } catch {
          // A failed renderer must not permanently stall the bounded stream.
        }
      }
      try {
        port.postMessage({
          sequence: frame.sequence,
          type: "visual-ack",
          version: BRIDGE_VERSION,
        });
      } catch {
        releasePort(true);
        updateSnapshot("disconnected", null, false);
        scheduleReconnect();
      }
    }
  };

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearScheduledTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearStaleTimer() {
    if (staleTimer !== null) {
      clearScheduledTimeout(staleTimer);
      staleTimer = null;
    }
  }

  function clearVisualFreshness() {
    if (visualFreshnessTimer !== null) {
      clearScheduledTimeout(visualFreshnessTimer);
      visualFreshnessTimer = null;
    }
    lastVisualFrameAt = 0;
  }

  function connect() {
    if (!runtime) return;
    if (!shouldStayConnected) reconnectAttempt = 0;
    shouldStayConnected = true;
    if (port || reconnectTimer !== null) return;
    openPort();
  }

  function openPort() {
    if (!runtime) return;
    try {
      port = runtime.connect(AUDIO_COMPANION_EXTENSION_ID, {
        name: BRIDGE_NAME,
      });
      port.onDisconnect.addListener(handleDisconnect);
      port.onMessage.addListener(handleMessage);
    } catch {
      releasePort(false);
      updateSnapshot("unavailable", null, false);
      scheduleReconnect();
    }
  }

  function disconnect() {
    shouldStayConnected = false;
    reconnectAttempt = 0;
    clearReconnectTimer();
    releasePort(true);
    updateSnapshot("unavailable", null, false);
  }

  function scheduleReconnect() {
    if (
      !shouldStayConnected ||
      !runtime ||
      port ||
      reconnectTimer !== null ||
      reconnectAttempt >= RECONNECT_DELAYS_MS.length
    ) {
      return;
    }
    const delay = RECONNECT_DELAYS_MS[reconnectAttempt];
    reconnectAttempt += 1;
    reconnectTimer = scheduleTimeout(() => {
      reconnectTimer = null;
      if (shouldStayConnected && !port) openPort();
    }, delay);
  }

  function releasePort(shouldDisconnect: boolean) {
    const current = port;
    port = null;
    clearStaleTimer();
    clearVisualFreshness();
    lastRhythmSequence = -1;
    lastVisualSequence = -1;
    if (!current) return;
    current.onDisconnect.removeListener(handleDisconnect);
    current.onMessage.removeListener(handleMessage);
    if (shouldDisconnect) current.disconnect();
  }

  function scheduleStaleState() {
    clearStaleTimer();
    staleTimer = scheduleTimeout(() => {
      staleTimer = null;
      if (snapshot.rhythm) updateSnapshot("stale", snapshot.rhythm);
    }, RHYTHM_STALE_AFTER_MS);
  }

  function scheduleVisualFreshnessCheck() {
    if (visualFreshnessTimer !== null) return;
    visualFreshnessTimer = scheduleTimeout(
      checkVisualFreshness,
      VISUAL_DETAIL_STALE_AFTER_MS,
    );
  }

  function checkVisualFreshness() {
    visualFreshnessTimer = null;
    const remaining =
      VISUAL_DETAIL_STALE_AFTER_MS - Math.max(0, now() - lastVisualFrameAt);
    if (remaining > 0) {
      visualFreshnessTimer = scheduleTimeout(checkVisualFreshness, remaining);
      return;
    }
    if (snapshot.hasVisualDetail) {
      updateSnapshot(snapshot.status, snapshot.rhythm, false);
    }
  }

  function subscribeState(listener: () => void) {
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }

  function subscribeVisual(listener: (frame: VisualFrameV1) => void) {
    visualListeners.add(listener);
    return () => {
      visualListeners.delete(listener);
    };
  }

  function updateSnapshot(
    status: AudioCompanionStatus,
    rhythm: RhythmFrameV1 | null,
    hasVisualDetail = snapshot.hasVisualDetail,
  ) {
    if (
      snapshot.status === status &&
      snapshot.rhythm === rhythm &&
      snapshot.hasVisualDetail === hasVisualDetail
    ) {
      return;
    }
    snapshot = Object.freeze({ hasVisualDetail, rhythm, status });
    for (const listener of stateListeners) listener();
  }

  return Object.freeze({
    connect,
    disconnect,
    getSnapshot: () => snapshot,
    subscribeState,
    subscribeVisual,
  });
}

function getBrowserRuntime(): ExternalRuntime | null {
  const chrome = (globalThis as { chrome?: { runtime?: ExternalRuntime } })
    .chrome;
  return chrome?.runtime?.connect ? chrome.runtime : null;
}

function isLocked(frame: RhythmFrameV1) {
  return frame.bpm !== null && frame.confidence >= LOCK_CONFIDENCE;
}

function normalizeRhythmFrame(value: unknown): RhythmFrameV1 | null {
  const frame = asRecord(value);
  if (
    frame?.version !== 1 ||
    !isNonNegativeInteger(frame.sequence) ||
    !isNonNegativeFinite(frame.sampledAtSeconds) ||
    !areUnitValues(frame, [
      "bass",
      "confidence",
      "energy",
      "highs",
      "mids",
      "onset",
    ])
  ) {
    return null;
  }

  const noTempo =
    frame.bpm === null &&
    frame.beatIntervalSeconds === null &&
    frame.beatOffsetSeconds === null;
  const validTempo =
    isRange(frame.bpm, 40, 240) &&
    isRange(frame.beatIntervalSeconds, 0.25, 1.5) &&
    isRange(frame.beatOffsetSeconds, 0, frame.beatIntervalSeconds, false);
  if (!noTempo && !validTempo) return null;

  return Object.freeze({
    bass: frame.bass as number,
    beatIntervalSeconds: frame.beatIntervalSeconds as number | null,
    beatOffsetSeconds: frame.beatOffsetSeconds as number | null,
    bpm: frame.bpm as number | null,
    confidence: frame.confidence as number,
    energy: frame.energy as number,
    highs: frame.highs as number,
    mids: frame.mids as number,
    onset: frame.onset as number,
    sampledAtSeconds: frame.sampledAtSeconds as number,
    sequence: frame.sequence as number,
    version: 1,
  });
}

function normalizeVisualFrame(value: unknown): VisualFrameV1 | null {
  const frame = asRecord(value);
  const spectrum = normalizeBytes(frame?.spectrum, 48);
  const waveform = normalizeBytes(frame?.waveform, 96);
  if (
    frame?.version !== 1 ||
    !isNonNegativeInteger(frame.sequence) ||
    !isNonNegativeFinite(frame.sampledAtSeconds) ||
    !spectrum ||
    !waveform
  ) {
    return null;
  }

  return Object.freeze({
    sampledAtSeconds: frame.sampledAtSeconds as number,
    sequence: frame.sequence as number,
    spectrum: Object.freeze(spectrum),
    version: 1,
    waveform: Object.freeze(waveform),
  });
}

function areUnitValues(value: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => isRange(value[key], 0, 1));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isRange(
  value: unknown,
  minimum: number,
  maximum: unknown,
  inclusiveMaximum = true,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    typeof maximum === "number" &&
    value >= minimum &&
    (inclusiveMaximum ? value <= maximum : value < maximum)
  );
}

function normalizeBytes(value: unknown, length: number) {
  if (!Array.isArray(value) || value.length !== length) return null;
  if (!value.every((item) => isRange(item, 0, 255))) return null;
  return value.map((item) => Math.round(item));
}
