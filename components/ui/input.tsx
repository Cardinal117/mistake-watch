import type { InputHTMLAttributes } from "react";
import { cx } from "@/lib/ui";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function Input({ className, hint, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? (
        <span className="technical-label block text-on-surface-variant">
          {label}
        </span>
      ) : null}
      <input
        id={inputId}
        className={cx(
          "h-11 w-full rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface transition duration-200 placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim focus:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim/20",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-label-sm text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}
