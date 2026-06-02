import { SignalApertureMark } from "@/components/brand";
import { cx } from "@/lib/ui";

type RoomTransitionOverlayProps = {
  active: boolean;
  detail?: string;
  label: string;
  tone?: "amber" | "cyan";
};

export function RoomTransitionOverlay({
  active,
  detail,
  label,
  tone = "cyan",
}: RoomTransitionOverlayProps) {
  if (!active) {
    return null;
  }

  const amber = tone === "amber";

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center bg-surface-container-lowest/84 px-6 backdrop-blur-xl"
      role="status"
    >
      <div
        className={cx(
          "relative w-full max-w-sm overflow-hidden rounded-lg border bg-surface/94 p-6 text-center shadow-screen-glow",
          amber
            ? "border-secondary-fixed-dim/35 shadow-amber-glow"
            : "border-primary-fixed-dim/35 shadow-screen-glow",
        )}
      >
        <div className="room-transition-sweep" data-tone={tone} />
        <div className="room-transition-orbit mx-auto mb-5" data-tone={tone}>
          <SignalApertureMark
            animated
            className="h-12 w-12"
            tone={amber ? "amber" : "cyan"}
          />
        </div>
        <p
          className={cx(
            "technical-label",
            amber ? "text-secondary-fixed-dim" : "text-primary-fixed-dim",
          )}
        >
          {label}
        </p>
        {detail ? (
          <p className="mx-auto mt-2 max-w-[18rem] text-body-md text-on-surface-variant">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
