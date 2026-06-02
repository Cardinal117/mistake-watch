import { cx } from "@/lib/ui";

type SignalApertureMarkProps = {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClassNames = {
  lg: "h-14",
  md: "h-10",
  sm: "h-8",
} as const;

export function SignalApertureMark({
  className,
  iconOnly = false,
  size = "md",
}: SignalApertureMarkProps) {
  const iconSize =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <span
      className={cx(
        "inline-flex min-w-0 items-center gap-2.5 text-on-surface",
        sizeClassNames[size],
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "signal-aperture-mark relative inline-flex shrink-0 items-center justify-center rounded-md border border-secondary-fixed-dim/45 bg-surface-container-lowest shadow-amber-glow",
          iconSize,
        )}
      >
        <svg
          className="h-[82%] w-[82%]"
          fill="none"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="43"
            stroke="rgb(255 186 32 / 0.34)"
            strokeWidth="4"
          />
          {Array.from({ length: 6 }).map((_, index) => {
            const rotation = index * 60;

            return (
              <path
                d="M50 9 L76 25 L61 47 L50 42 Z"
                fill="rgb(255 186 32 / 0.72)"
                key={rotation}
                stroke="rgb(255 222 168 / 0.9)"
                strokeLinejoin="round"
                strokeWidth="2"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "50px 50px",
                }}
              />
            );
          })}
          <circle
            cx="50"
            cy="50"
            r="18"
            fill="rgb(0 219 233 / 0.13)"
            stroke="rgb(0 219 233 / 0.65)"
            strokeDasharray="5 5"
            strokeWidth="4"
          />
          <path
            d="M45 39 L45 61 L64 50 Z"
            fill="rgb(125 244 255)"
            stroke="rgb(219 252 255 / 0.85)"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      {iconOnly ? null : (
        <span className="min-w-0">
          <span
            className={cx(
              "block truncate font-black leading-none tracking-normal",
              size === "sm" ? "text-body-lg" : "text-headline-md",
            )}
          >
            Mistake <span className="text-secondary-fixed-dim">Watch</span>
          </span>
          <span className="technical-label mt-1 hidden text-primary-fixed-dim/85 sm:block">
            Signal Aperture
          </span>
        </span>
      )}
    </span>
  );
}
