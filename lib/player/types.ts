export type PlaybackMode = "watch" | "listen";

export type PlaybackSourceKind = "direct" | "hls" | "youtube";

export type PlaybackStatus =
  | "buffering"
  | "ended"
  | "error"
  | "paused"
  | "playing";

export type PlaybackSource = {
  durationSeconds?: number;
  kind: PlaybackSourceKind;
  title?: string;
  url: string;
};

export type CanonicalPlaybackState = {
  activeQueueItemId: string | null;
  controllerMemberId: string | null;
  hostMemberId: string;
  mode: PlaybackMode;
  playbackRate: number;
  positionSeconds: number;
  roomId: string;
  serverUpdatedAtMs: number;
  source: PlaybackSource | null;
  status: PlaybackStatus;
};

export type SyncThresholds = {
  hardSeekDriftSeconds: number;
  maxRateCorrection: number;
  rateCorrectionDriftSeconds: number;
  settledDriftSeconds: number;
};

export type LocalPlaybackSample = {
  autoplayBlocked?: boolean;
  durationSeconds?: number;
  paused: boolean;
  playbackRate: number;
  positionSeconds: number;
};

export type SyncCorrection =
  | {
      driftSeconds: number;
      kind: "none";
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "set-playback-rate";
      playbackRate: number;
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "seek";
      shouldPlay: boolean;
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "hard-seek";
      shouldPlay: boolean;
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "pause-and-seek";
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "play";
      playbackRate: number;
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "user-interaction-required";
      targetPositionSeconds: number;
    }
  | {
      driftSeconds: number;
      kind: "wait";
      targetPositionSeconds: number;
    };
