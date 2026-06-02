import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type BadgeTone = "cyan" | "amber" | "neutral" | "error";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, string> = {
  cyan: "border-primary-fixed-dim/35 bg-primary-fixed-dim/12 text-primary-fixed-dim",
  amber:
    "border-secondary-fixed-dim/35 bg-secondary-fixed-dim/12 text-secondary-fixed-dim",
  neutral: "border-white/10 bg-surface-variant/35 text-on-surface-variant",
  error: "border-error/35 bg-error-container/25 text-error",
};

export function Badge({
  children,
  className,
  tone = "cyan",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx(
        "technical-label inline-flex min-h-6 items-center rounded-sm border px-2 py-1",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
