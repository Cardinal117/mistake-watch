import type { CSSProperties, InputHTMLAttributes } from "react";
import { cx } from "@/lib/ui";

type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  tone?: "amber" | "cyan" | "dynamic";
};

export function Slider({
  className,
  label,
  max,
  min,
  tone = "cyan",
  value,
  ...props
}: SliderProps) {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  const numericMin = typeof min === "number" ? min : Number(min ?? 0);
  const numericMax = typeof max === "number" ? max : Number(max ?? 100);
  const progress =
    numericMax > numericMin
      ? ((numericValue - numericMin) / (numericMax - numericMin)) * 100
      : 0;

  return (
    <label className="grid gap-2">
      <span className="sr-only">{label}</span>
      <input
        className={cx("mistake-slider w-full", className)}
        data-tone={tone}
        max={max}
        min={min}
        style={
          {
            "--slider-progress": `${Math.min(100, Math.max(0, progress))}%`,
          } as CSSProperties
        }
        type="range"
        value={value}
        {...props}
      />
    </label>
  );
}
