import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type PanelTone = "default" | "low" | "high" | "glass";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: PanelTone;
};

const tones: Record<PanelTone, string> = {
  default: "border border-white/10 bg-surface-container-low/85 backdrop-blur-xl",
  low: "border border-white/10 bg-surface-container-low/75 backdrop-blur-xl",
  high: "border border-white/10 bg-surface-container/85 backdrop-blur-xl",
  glass: "glass-panel",
};

export function Panel({
  children,
  className,
  tone = "default",
  ...props
}: PanelProps) {
  return (
    <div className={cx("rounded-md p-5", tones[tone], className)} {...props}>
      {children}
    </div>
  );
}
