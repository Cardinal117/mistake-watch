import { cx } from "@/lib/ui";

type SignalApertureMarkProps = {
  animated?: boolean;
  className?: string;
  label?: string;
  tone?: "cyan" | "amber";
};

type SignalApertureLockupProps = {
  className?: string;
  compact?: boolean;
};

export function SignalApertureMark({
  animated = false,
  className,
  label,
  tone = "cyan",
}: SignalApertureMarkProps) {
  const title = label ?? "Mistake Watch";

  return (
    <svg
      aria-label={label ? title : undefined}
      aria-hidden={label ? undefined : true}
      className={cx(
        "signal-aperture-mark",
        animated && "signal-aperture-mark--animated",
        tone === "amber" && "signal-aperture-mark--amber",
        className,
      )}
      role={label ? "img" : undefined}
      viewBox="0 0 64 64"
    >
      {label ? <title>{title}</title> : null}
      <rect
        className="signal-aperture-mark__tile"
        height="54"
        rx="12"
        width="54"
        x="5"
        y="5"
      />
      <path
        className="signal-aperture-mark__trace signal-aperture-mark__trace--cyan"
        d="M18 13h-5v9M46 13h5v9M18 51h-5v-9M46 51h5v-9"
      />
      <path
        className="signal-aperture-mark__trace signal-aperture-mark__trace--amber"
        d="M28 9h8M28 55h8M9 28v8M55 28v8"
      />
      <g className="signal-aperture-mark__blades">
        <path d="M31.5 10.5 43.5 18 34 30.5 23 30z" />
        <path d="M45.2 19.2 51.8 31.8 36.5 35.4 31.8 23.2z" />
        <path d="M51.2 34.8 43.7 46.8 31.5 37.2 35.8 26.4z" />
        <path d="M40.4 49.8 26.2 51 29.8 35.7 42.2 31.4z" />
        <path d="M23.5 49.8 12.4 40.8 25.8 32.2 36.5 37.5z" />
        <path d="M11.5 36.8 13.8 22.8 28.2 27.8 31.8 40.2z" />
      </g>
      <circle className="signal-aperture-mark__core-ring" cx="32" cy="32" r="13" />
      <circle className="signal-aperture-mark__core" cx="32" cy="32" r="7" />
      <path className="signal-aperture-mark__play" d="M30 27.5v9l8-4.5z" />
    </svg>
  );
}

export function SignalApertureLockup({
  className,
  compact = false,
}: SignalApertureLockupProps) {
  return (
    <div
      className={cx(
        "flex min-w-0 items-center gap-2 text-primary-fixed-dim",
        className,
      )}
    >
      <SignalApertureMark
        className={compact ? "h-8 w-8" : "h-9 w-9"}
      />
      <div className="min-w-0">
        <span
          className={cx(
            "block truncate font-bold leading-none text-on-surface",
            compact ? "text-body-md" : "text-headline-md",
          )}
        >
          Mistake Watch
        </span>
        {compact ? (
          <span className="technical-label mt-0.5 block truncate text-secondary-fixed-dim">
            Signal room
          </span>
        ) : null}
      </div>
    </div>
  );
}
