import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

export function TabsList({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "grid gap-1 rounded-md border border-white/10 bg-surface-container-lowest p-1",
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function TabButton({
  active,
  children,
  className,
  type = "button",
  ...props
}: TabButtonProps) {
  return (
    <button
      aria-selected={active}
      className={cx(
        "rounded-sm px-3 py-2 text-label-sm font-semibold text-on-surface-variant transition duration-200 hover:text-on-surface",
        active && "bg-primary-fixed-dim/12 text-primary-fixed-dim",
        className,
      )}
      role="tab"
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
