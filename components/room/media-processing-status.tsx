import { SignalProgressBar, SignalStatusChip } from "@/components/ui";
import {
  hasMeasurableProgress,
  type SignalDisplayState,
} from "@/lib/status/display-state";
import { cx } from "@/lib/ui";

type MediaProcessingStatusProps = {
  className?: string;
  compact?: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  state: SignalDisplayState;
};

export function MediaProcessingStatus({
  className,
  compact = false,
  onPrimaryAction,
  onSecondaryAction,
  state,
}: MediaProcessingStatusProps) {
  const latestEvent =
    state.latestEvent && state.latestEvent !== state.detail
      ? state.latestEvent
      : null;
  const showDetail = state.detail && !hasMeasurableProgress(state);

  return (
    <div
      aria-live={state.state === "failed" ? "assertive" : "polite"}
      className={cx(
        "grid gap-2 rounded-sm border border-white/10 bg-background/16 p-2",
        state.tone === "danger" && "border-error/25 bg-error/8",
        state.tone === "warning" &&
          "border-secondary-fixed-dim/25 bg-secondary-fixed-dim/8",
        compact && "gap-1 p-1.5",
        className,
      )}
      role={state.state === "failed" ? "alert" : "status"}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <SignalStatusChip state={state} />
        {latestEvent ? (
          <span className="min-w-0 truncate text-[11px] text-on-surface-variant">
            {latestEvent}
          </span>
        ) : null}
      </div>
      {showDetail ? (
        <p className="text-label-sm text-on-surface-variant">{state.detail}</p>
      ) : null}
      <SignalProgressBar state={state} />
      {state.primaryAction || state.secondaryAction ? (
        <div className="flex flex-wrap gap-2">
          {state.primaryAction ? (
            <button
              className="inline-flex h-8 items-center justify-center rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/10 px-2 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/15 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={state.primaryAction.disabled || !onPrimaryAction}
              onClick={onPrimaryAction}
              type="button"
            >
              {state.primaryAction.label}
            </button>
          ) : null}
          {state.secondaryAction ? (
            <button
              className="inline-flex h-8 items-center justify-center rounded-sm border border-error/30 bg-error/8 px-2 text-label-sm font-semibold text-error transition hover:bg-error/12 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={state.secondaryAction.disabled || !onSecondaryAction}
              onClick={onSecondaryAction}
              type="button"
            >
              {state.secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
