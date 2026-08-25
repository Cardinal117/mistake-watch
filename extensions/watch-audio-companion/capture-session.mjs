import { normalizeAnalyserTelemetry } from "./protocol.mjs";
import { isFreshRhythmFrame } from "./rhythm-contract.mjs";
import { createVisualFrameV1 } from "./visual-frame-contract.mjs";

const SIGNAL_THRESHOLD = 0.0001;
const RHYTHM_FRAME_INTERVAL_SECONDS = 1;
const VISUAL_FRAME_INTERVAL_MS = 1_000 / 24;

export class CaptureSession {
  constructor({
    createAudioContext,
    createWorkletNode,
    clearScheduledInterval = (timerId) => globalThis.clearInterval(timerId),
    getUserMedia,
    nowSeconds = () => globalThis.performance.now() / 1_000,
    onRhythmFrame = () => {},
    onStateChange = () => {},
    onVisualFrame = () => {},
    scheduleInterval = (callback, delay) =>
      globalThis.setInterval(callback, delay),
    workletModuleUrl,
  }) {
    this.dependencies = {
      createAudioContext,
      createWorkletNode,
      clearScheduledInterval,
      getUserMedia,
      nowSeconds,
      onRhythmFrame,
      onStateChange,
      onVisualFrame,
      scheduleInterval,
      workletModuleUrl,
    };
    this.resources = null;
    this.lastRhythmFrameSeconds = null;
    this.status = createIdleStatus("not-started");
  }

  getStatus() {
    return { ...this.status };
  }

  async start({ streamId, tabId }) {
    if (this.status.active || this.status.phase === "starting") {
      throw new Error("Audio capture is already active.");
    }

    if (!streamId || !Number.isInteger(tabId)) {
      throw new Error("A valid capture stream and tab are required.");
    }

    this.setStatus({
      ...createIdleStatus("starting"),
      phase: "starting",
      tabId,
    });
    this.lastRhythmFrameSeconds = null;

    try {
      const stream = await this.dependencies.getUserMedia(
        createTabAudioConstraints(streamId),
      );
      const tracks = stream.getTracks();
      const audioTracks = stream.getAudioTracks();

      this.resources = createResources({ stream, tracks });

      if (audioTracks.length === 0) {
        throw new Error("The captured tab did not provide an audio track.");
      }

      const context = this.dependencies.createAudioContext();
      this.resources.context = context;
      await context.audioWorklet.addModule(this.dependencies.workletModuleUrl);

      const source = context.createMediaStreamSource(stream);
      const probe = this.dependencies.createWorkletNode(context);
      const analyser = context.createAnalyser();
      const silentOutput = context.createGain();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      this.resources.source = source;
      this.resources.probe = probe;
      this.resources.analyser = analyser;
      this.resources.frequencyBytes = new Uint8Array(
        analyser.frequencyBinCount,
      );
      this.resources.silentOutput = silentOutput;
      this.resources.waveformBytes = new Uint8Array(analyser.fftSize);
      silentOutput.gain.value = 0;

      source.connect(context.destination);
      source.connect(probe);
      source.connect(analyser);
      probe.connect(silentOutput);
      analyser.connect(silentOutput);
      silentOutput.connect(context.destination);

      const endedHandler = () => {
        void this.stop("stream-ended");
      };
      this.resources.endedHandler = endedHandler;

      for (const track of tracks) {
        track.addEventListener("ended", endedHandler, { once: true });
      }

      probe.port.onmessage = (event) => {
        this.updateProbe(event.data);
      };

      if (context.state === "suspended") {
        await context.resume();
      }

      this.setStatus({
        active: true,
        contextState: context.state,
        frames: 0,
        hasSignal: false,
        peak: 0,
        phase: "active",
        reason: "capture-started",
        rhythm: null,
        rms: 0,
        tabId,
      });
      this.startVisualSampler();

      return this.getStatus();
    } catch (error) {
      await this.releaseResources();
      this.setStatus(createIdleStatus("start-failed"));
      throw error;
    }
  }

  async stop(reason = "user-stopped") {
    if (!this.resources && !this.status.active) {
      this.setStatus(createIdleStatus(reason));
      return this.getStatus();
    }

    this.setStatus({
      ...this.status,
      active: false,
      phase: "stopping",
      reason,
    });
    await this.releaseResources();
    this.setStatus(createIdleStatus(reason));
    return this.getStatus();
  }

  async releaseResources() {
    const resources = this.resources;
    this.resources = null;

    if (!resources) {
      return;
    }

    if (resources.probe) {
      resources.probe.port.onmessage = null;
    }

    if (resources.visualTimer !== null) {
      this.dependencies.clearScheduledInterval(resources.visualTimer);
      resources.visualTimer = null;
    }

    for (const track of resources.tracks) {
      if (resources.endedHandler) {
        track.removeEventListener("ended", resources.endedHandler);
      }
      stopTrackSafely(track);
    }

    disconnectSafely(resources.source);
    disconnectSafely(resources.probe);
    disconnectSafely(resources.analyser);
    disconnectSafely(resources.silentOutput);

    await closeContextSafely(resources.context);
  }

  updateProbe(value) {
    if (!this.status.active) {
      return;
    }

    const probe = normalizeAnalyserTelemetry(value);
    const hadSignal = this.status.hasSignal;
    const hasSignal = hadSignal || probe.rms > SIGNAL_THRESHOLD;
    const previousRhythm = this.status.rhythm;
    const nextRhythm = selectFreshRhythm(probe.rhythm, previousRhythm);
    const acceptedNewRhythm = nextRhythm !== previousRhythm;

    this.status = {
      ...this.status,
      frames: this.status.frames + probe.frames,
      hasSignal,
      peak: probe.peak,
      rhythm: nextRhythm,
      rms: probe.rms,
    };

    if (
      hasSignal !== hadSignal ||
      hasMaterialRhythmChange(previousRhythm, nextRhythm)
    ) {
      this.dependencies.onStateChange(this.getStatus());
    }

    if (acceptedNewRhythm && this.shouldDeliverRhythmFrame(nextRhythm)) {
      this.lastRhythmFrameSeconds = nextRhythm.sampledAtSeconds;
      this.dependencies.onRhythmFrame(nextRhythm);
    }
  }

  shouldDeliverRhythmFrame(frame) {
    return (
      this.lastRhythmFrameSeconds === null ||
      frame.sampledAtSeconds - this.lastRhythmFrameSeconds >=
        RHYTHM_FRAME_INTERVAL_SECONDS
    );
  }

  startVisualSampler() {
    if (!this.resources?.analyser || this.resources.visualTimer !== null) {
      return;
    }

    this.resources.visualTimer = this.dependencies.scheduleInterval(
      () => this.sampleVisualFrame(),
      VISUAL_FRAME_INTERVAL_MS,
    );
  }

  sampleVisualFrame() {
    const resources = this.resources;
    if (!this.status.active || !resources?.analyser) {
      return;
    }

    resources.analyser.getByteFrequencyData(resources.frequencyBytes);
    resources.analyser.getByteTimeDomainData(resources.waveformBytes);
    resources.visualSequence += 1;
    const frame = createVisualFrameV1({
      frequencyBytes: resources.frequencyBytes,
      sampledAtSeconds: this.dependencies.nowSeconds(),
      sequence: resources.visualSequence,
      waveformBytes: resources.waveformBytes,
    });

    if (frame) {
      this.dependencies.onVisualFrame(frame);
    }
  }

  setStatus(status) {
    this.status = status;
    if (!status.active) {
      this.lastRhythmFrameSeconds = null;
    }
    this.dependencies.onStateChange(this.getStatus());
  }
}

export function createTabAudioConstraints(streamId) {
  return {
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  };
}

function createIdleStatus(reason) {
  return {
    active: false,
    contextState: "closed",
    frames: 0,
    hasSignal: false,
    peak: 0,
    phase: "idle",
    reason,
    rhythm: null,
    rms: 0,
    tabId: null,
  };
}

function selectFreshRhythm(candidate, previous) {
  if (!candidate) {
    return previous;
  }

  return isFreshRhythmFrame(candidate, previous, candidate.sampledAtSeconds)
    ? candidate
    : previous;
}

function hasMaterialRhythmChange(previous, next) {
  if (!next) {
    return false;
  }

  if (!previous || (previous.bpm === null) !== (next.bpm === null)) {
    return true;
  }

  return (
    next.bpm !== null &&
    (Math.abs(next.bpm - previous.bpm) >= 2 ||
      confidenceTier(next.confidence) !== confidenceTier(previous.confidence))
  );
}

function confidenceTier(value) {
  if (value >= 0.8) {
    return 2;
  }

  return value >= 0.5 ? 1 : 0;
}

function createResources({ stream, tracks }) {
  return {
    analyser: null,
    context: null,
    endedHandler: null,
    frequencyBytes: null,
    probe: null,
    silentOutput: null,
    source: null,
    stream,
    tracks,
    visualSequence: 0,
    visualTimer: null,
    waveformBytes: null,
  };
}

function disconnectSafely(node) {
  if (!node) {
    return;
  }

  try {
    node.disconnect();
  } catch {
    // A partially initialized graph may already be disconnected.
  }
}

function stopTrackSafely(track) {
  try {
    track.stop();
  } catch {
    // A browser-owned track may already have reached its terminal state.
  }
}

async function closeContextSafely(context) {
  if (!context || context.state === "closed") {
    return;
  }

  try {
    await context.close();
  } catch {
    // Cleanup remains idempotent when the browser closes the context first.
  }
}
