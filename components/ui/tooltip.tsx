import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Tooltip({ children, className, ...props }: TooltipProps) {
  return (
    <span
      className={cx(
        "pointer-events-none absolute z-50 rounded-sm border border-white/10 bg-surface-container-high px-2 py-1 text-label-sm text-on-surface opacity-0 shadow-screen-glow transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
        className,
      )}
      role="tooltip"
      {...props}
    >
      {children}
    </span>
  );
}
