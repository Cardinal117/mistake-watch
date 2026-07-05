import type { ReactNode } from "react";
import {
  hasMeasurableProgress,
  type SignalDisplayState,
  type SignalTone,
} from "@/lib/status/display-state";
import { cx } from "@/lib/ui";

type SignalStatusChipProps = {
  className?: string;
  state: Pick<SignalDisplayState, "label" | "state" | "tone">;
};

type SignalInlineStatusProps = {
  className?: string;
  icon?: ReactNode;
  state: SignalDisplayState;
};

type SignalProgressBarProps = {
  className?: string;
  state: SignalDisplayState;
};

type SignalSkeletonProps = {
  "aria-label"?: string;
  className?: string;
  lines?: number;
  media?: "none" | "thumbnail";
};

const toneClasses: Record<SignalTone, string> = {
  danger: "border-error/35 bg-error-container/25 text-error",
  info: "border-primary-fixed-dim/35 bg-primary-fixed-dim/12 text-primary-fixed-dim",
  neutral: "border-white/10 bg-surface-variant/35 text-on-surface-variant",
  success:
    "border-primary-fixed-dim/35 bg-primary-fixed-dim/12 text-primary-fixed-dim",
  warning:
    "border-secondary-fixed-dim/35 bg-secondary-fixed-dim/12 text-secondary-fixed-dim",
};

const progressToneClasses: Record<SignalTone, string> = {
  danger: "bg-error shadow-[0_0_14px_rgb(255_180_171_/_0.3)]",
  info: "bg-primary-fixed-dim shadow-[0_0_14px_rgb(0_219_233_/_0.45)]",
  neutral: "bg-on-surface-variant",
  success: "bg-primary-fixed-dim shadow-[0_0_14px_rgb(0_219_233_/_0.45)]",
  warning: "bg-secondary-fixed-dim shadow-[0_0_14px_rgb(255_186_32_/_0.35)]",
};

export function SignalStatusChip({ className, state }: SignalStatusChipProps) {
  return (
    <span
      className={cx(
        "technical-label inline-flex min-h-6 items-center rounded-sm border px-2 py-1",
        toneClasses[state.tone],
        className,
      )}
      data-signal-state={state.state}
    >
      {state.label}
    </span>
  );
}

export function SignalInlineStatus({
  className,
  icon,
  state,
}: SignalInlineStatusProps) {
  return (
    <div
      aria-live={state.state === "failed" ? "assertive" : "polite"}
      className={cx(
        "inline-flex min-w-0 items-center gap-2 text-label-sm text-on-surface-variant",
        className,
      )}
      role={state.state === "failed" ? "alert" : "status"}
    >
      {icon ?? (
        <span
          aria-hidden
          className={cx(
            "h-2 w-2 shrink-0 rounded-full motion-safe:animate-pulse",
            state.tone === "danger"
              ? "bg-error"
              : state.tone === "warning"
                ? "bg-secondary-fixed-dim"
                : "bg-primary-fixed-dim",
          )}
        />
      )}
      <span className="min-w-0 truncate">
        <span className="font-semibold text-on-surface">{state.label}</span>
        {state.detail ? <span> / {state.detail}</span> : null}
      </span>
    </div>
  );
}

export function SignalProgressBar({
  className,
  state,
}: SignalProgressBarProps) {
  if (!hasMeasurableProgress(state)) {
    return null;
  }

  const value = Math.round(state.progressPercent);

  return (
    <div className={cx("grid gap-1", className)}>
      <div className="flex items-center justify-between gap-3 text-[11px] text-on-surface-variant">
        <span className="min-w-0 truncate">{state.detail}</span>
        <span>{value}%</span>
      </div>
      <div
        aria-label={state.label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        className="h-1.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_8px_rgb(0_0_0_/_0.35)]"
        role="progressbar"
      >
        <div
          className={cx(
            "h-full transition-[width] duration-300",
            progressToneClasses[state.tone],
          )}
          style={{ width: `${state.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export function SignalSkeleton({
  "aria-label": ariaLabel = "Loading",
  className,
  lines = 2,
  media = "none",
}: SignalSkeletonProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={cx(
        "grid gap-3 rounded-sm border border-white/8 bg-white/[0.035] p-2",
        media === "thumbnail" &&
          "grid-cols-[4.5rem_minmax(0,1fr)] items-center",
        className,
      )}
      role="status"
    >
      {media === "thumbnail" ? (
        <span className="aspect-video rounded-sm bg-white/10 motion-safe:animate-pulse" />
      ) : null}
      <span className="grid gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <span
            className={cx(
              "h-3 rounded-full bg-white/10 motion-safe:animate-pulse",
              index === 0 ? "w-4/5" : "w-2/5",
            )}
            key={index}
          />
        ))}
      </span>
    </div>
  );
}
