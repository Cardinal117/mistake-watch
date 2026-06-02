import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-fixed-dim text-on-primary-fixed shadow-screen-glow hover:bg-primary-container",
  secondary:
    "border border-primary-fixed-dim/45 bg-surface-container/60 text-primary-fixed-dim hover:bg-primary-fixed-dim/10",
  ghost:
    "border border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
  danger:
    "border border-error/40 bg-error-container/35 text-error hover:bg-error-container/55",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-label-sm",
  md: "h-11 px-4 text-label-md",
  lg: "h-12 px-5 text-body-md",
};

export function buttonClassName({
  className,
  size = "md",
  variant = "primary",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ className, size, variant })}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
