import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type IconButtonVariant = "default" | "primary" | "ghost" | "danger";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
};

const variants: Record<IconButtonVariant, string> = {
  default:
    "border border-white/10 bg-surface-container text-on-surface-variant hover:border-primary-fixed-dim/45 hover:text-primary-fixed-dim",
  primary:
    "bg-primary-fixed-dim text-on-primary-fixed shadow-screen-glow hover:bg-primary-container",
  ghost: "text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
  danger:
    "border border-error/35 bg-error-container/20 text-error hover:bg-error-container/45",
};

export function IconButton({
  label,
  children,
  className,
  variant = "default",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm transition duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
