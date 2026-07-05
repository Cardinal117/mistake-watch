import type { ReactNode } from "react";
import { SignalStatusChip } from "@/components/ui";
import type { SignalDisplayState } from "@/lib/status/display-state";
import { cx } from "@/lib/ui";

type IdleSignalStateProps = {
  children?: ReactNode;
  className?: string;
  headingId?: string;
  icon?: ReactNode;
  state: SignalDisplayState;
  title?: string;
};

export function IdleSignalState({
  children,
  className,
  headingId,
  icon,
  state,
  title,
}: IdleSignalStateProps) {
  return (
    <div
      className={cx(
        "grid max-w-xl place-items-center gap-5 text-center",
        className,
      )}
      role="status"
    >
      {icon ? (
        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-surface-container/70 text-primary-fixed-dim backdrop-blur-xl">
          {icon}
        </div>
      ) : null}
      <div className="grid gap-2">
        <SignalStatusChip state={state} />
        <h2
          className="text-headline-md font-semibold text-on-surface [overflow-wrap:anywhere] sm:text-headline-lg"
          id={headingId}
        >
          {title ?? state.label}
        </h2>
        <p className="text-body-md text-on-surface-variant">{state.detail}</p>
      </div>
      {children}
    </div>
  );
}
