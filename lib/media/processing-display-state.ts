import {
  clampProgressPercent,
  type SignalDisplayState,
  type SignalTone,
} from "../status/display-state";

type UploadLifecyclePhase =
  | "blocked"
  | "failed"
  | "inspecting"
  | "loading"
  | "processing"
  | "queued"
  | "ready"
  | "uploading";

export type UploadProgressDisplayInput = {
  detail: string;
  label?: string;
  latestEvent?: string | null;
  phase: UploadLifecyclePhase;
  progressPercent?: number;
  tone?: SignalTone;
};

export type RecoverableUploadDisplayInput = {
  activeState?: SignalDisplayState | null;
  bytesUploaded: number;
  errorMessage?: string | null;
  fileName: string;
  fileSizeBytes: number;
  resumable: boolean;
  resumableUntil?: string | null;
  status: "expired" | "failed" | "paused" | "uploading";
};

export type MediaAssetDisplayInput = {
  latestEvent?: string | null;
  processingDecisionReason?: string | null;
  processingEstimatedCredits?: number | null;
  processingErrorMessage?: string | null;
  processingRequiresApproval?: boolean;
  processingStatus?: string | null;
  processingStrategy?: string | null;
  status?: string | null;
  title?: string | null;
};

export function resolveUploadProgressDisplayState(
  input: UploadProgressDisplayInput,
): SignalDisplayState {
  const progressPercent =
    typeof input.progressPercent === "number"
      ? clampProgressPercent(input.progressPercent)
      : undefined;

  if (input.phase === "uploading") {
    return {
      detail: input.detail,
      label: input.label ?? "Uploading",
      latestEvent: input.latestEvent,
      progressPercent,
      state: "uploading",
      tone: input.tone ?? "info",
    };
  }

  if (input.phase === "ready") {
    return {
      detail: input.detail,
      label: input.label ?? "Ready",
      latestEvent: input.latestEvent,
      state: "ready",
      tone: input.tone ?? "success",
    };
  }

  if (input.phase === "failed") {
    return {
      detail: input.detail,
      label: input.label ?? "Failed",
      latestEvent: input.latestEvent,
      progressPercent,
      state: "failed",
      tone: input.tone ?? "danger",
    };
  }

  if (input.phase === "blocked") {
    return {
      detail: input.detail,
      label: input.label ?? "Needs action",
      latestEvent: input.latestEvent,
      progressPercent,
      state: "blocked",
      tone: input.tone ?? "warning",
    };
  }

  if (input.phase === "queued") {
    return {
      detail: input.detail,
      label: input.label ?? "Queued",
      latestEvent: input.latestEvent,
      state: "queued",
      tone: input.tone ?? "info",
    };
  }

  if (input.phase === "processing" || input.phase === "inspecting") {
    return {
      detail: input.detail,
      label: input.label ?? (input.phase === "inspecting" ? "Inspecting" : "Processing"),
      latestEvent: input.latestEvent,
      state: "processing",
      tone: input.tone ?? "info",
    };
  }

  return {
    detail: input.detail,
    label: input.label ?? "Loading",
    latestEvent: input.latestEvent,
    state: "loading",
    tone: input.tone ?? "info",
  };
}

export function resolveRecoverableUploadDisplayState(
  input: RecoverableUploadDisplayInput,
): SignalDisplayState {
  if (input.activeState) {
    return input.activeState;
  }

  const progressPercent = calculateByteProgressPercent({
    bytesUploaded: input.bytesUploaded,
    fileSizeBytes: input.fileSizeBytes,
  });
  const progressDetail = `${formatBytes(input.bytesUploaded)} of ${formatBytes(
    input.fileSizeBytes,
  )} uploaded${input.resumableUntil ? ` / resumable until ${input.resumableUntil}` : ""}`;

  if (input.status === "expired" || !input.resumable) {
    return {
      detail:
        input.errorMessage ??
        "Upload recovery window expired. Cancel it and upload again.",
      label: "Expired",
      primaryAction: { disabled: true, label: "Resume", tone: "secondary" },
      progressPercent,
      secondaryAction: { label: "Cancel upload", tone: "danger" },
      state: "failed",
      tone: "danger",
    };
  }

  if (input.status === "failed") {
    return {
      detail: input.errorMessage ?? progressDetail,
      label: "Retry available",
      primaryAction: { label: "Resume", tone: "primary" },
      progressPercent,
      secondaryAction: { label: "Cancel upload", tone: "danger" },
      state: "recoverable",
      tone: "warning",
    };
  }

  return {
    detail: progressDetail,
    label: input.status === "uploading" ? "Recoverable" : "Paused",
    primaryAction: { label: "Resume", tone: "primary" },
    progressPercent,
    secondaryAction: { label: "Cancel upload", tone: "danger" },
    state: "recoverable",
    tone: "warning",
  };
}

export function resolveMediaAssetDisplayState(
  input: MediaAssetDisplayInput,
): SignalDisplayState {
  const processingStatus = input.processingStatus ?? "";
  const processingStrategy = input.processingStrategy ?? "";
  const title = input.title?.trim() || "Media";

  if (
    processingStatus === "ready" ||
    processingStatus === "not_required" ||
    input.status === "ready"
  ) {
    return {
      detail:
        processingStrategy === "direct_ready"
          ? `${title} is ready without conversion.`
          : `${title} is ready.`,
      label: processingStrategy === "direct_ready" ? "Direct" : "Ready",
      latestEvent: input.latestEvent,
      state: "ready",
      tone: "success",
    };
  }

  if (
    input.processingRequiresApproval ||
    processingStatus === "approval_required" ||
    processingStrategy === "needs_approval"
  ) {
    return {
      detail:
        input.processingDecisionReason ??
        "Owner approval is required before CloudConvert spends credits.",
      label: "Needs approval",
      latestEvent: input.latestEvent,
      primaryAction: { label: "Approve conversion", tone: "primary" },
      state: "blocked",
      tone: "warning",
    };
  }

  if (processingStatus === "failed" || input.status === "failed") {
    return {
      detail:
        input.processingErrorMessage ??
        "Processing failed. Retry from the stored R2 source when available.",
      label: "Failed",
      latestEvent: input.latestEvent,
      primaryAction: { label: "Retry conversion", tone: "primary" },
      state: "failed",
      tone: "danger",
    };
  }

  if (processingStatus === "queued") {
    return {
      detail: "CloudConvert accepted the job and is waiting to start.",
      label: "Queued",
      latestEvent: input.latestEvent,
      state: "queued",
      tone: "info",
    };
  }

  if (
    processingStatus === "processing" ||
    input.status === "processing" ||
    processingStrategy === "convert"
  ) {
    return {
      detail:
        input.latestEvent ??
        "CloudConvert is creating a browser-safe MP4 and thumbnail.",
      label: "Converting",
      latestEvent: input.latestEvent,
      state: "processing",
      tone: "info",
    };
  }

  return {
    detail: "Media is waiting for processing status.",
    label: "Waiting",
    latestEvent: input.latestEvent,
    state: "waiting",
    tone: "neutral",
  };
}

function calculateByteProgressPercent(input: {
  bytesUploaded: number;
  fileSizeBytes: number;
}) {
  if (input.fileSizeBytes <= 0) {
    return undefined;
  }

  return clampProgressPercent((input.bytesUploaded / input.fileSizeBytes) * 100);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}
