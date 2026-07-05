export type SignalStateKind =
  | "waiting"
  | "loading"
  | "uploading"
  | "processing"
  | "queued"
  | "blocked"
  | "recoverable"
  | "failed"
  | "ready";

export type SignalTone = "danger" | "info" | "neutral" | "success" | "warning";

export type SignalDisplayAction = {
  disabled?: boolean;
  label: string;
  tone?: "danger" | "primary" | "secondary";
};

export type SignalDisplayState = {
  detail: string;
  label: string;
  latestEvent?: string | null;
  primaryAction?: SignalDisplayAction | null;
  progressPercent?: number;
  secondaryAction?: SignalDisplayAction | null;
  state: SignalStateKind;
  tone: SignalTone;
};

export function clampProgressPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function hasMeasurableProgress(
  state: SignalDisplayState,
): state is SignalDisplayState & { progressPercent: number } {
  return typeof state.progressPercent === "number";
}
