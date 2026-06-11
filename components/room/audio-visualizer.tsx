import type { WaveformSourcePlan } from "@/lib/player";
import { cx } from "@/lib/ui";

type AudioVisualizerProps = {
  active?: boolean;
  bars?: number;
  className?: string;
  plan?: WaveformSourcePlan;
};

export function AudioVisualizer({
  active = true,
  bars = 28,
  className,
  plan,
}: AudioVisualizerProps) {
  const animated =
    active &&
    plan?.analysisMode !== "static" &&
    plan?.analysisMode !== "precomputed_peaks";
  const label =
    plan?.analysisMode === "browser_analyser"
      ? "Audio-reactive visualizer"
      : plan?.analysisMode === "precomputed_peaks"
        ? "Precomputed waveform visualizer"
        : plan?.analysisMode === "static"
          ? "Static waveform visualizer"
          : "Generated fallback visualizer";

  return (
    <div
      aria-label={label}
      className={cx(
        "flex h-24 items-end justify-center gap-1.5 overflow-hidden",
        className,
      )}
      data-waveform-mode={plan?.analysisMode ?? "fallback_progress"}
      data-waveform-source={plan?.kind ?? "youtube_embed"}
      role="img"
    >
      {Array.from({ length: bars }).map((_, index) => (
        <span
          className={cx(
            "w-1.5 rounded-sm bg-secondary-fixed-dim/80 shadow-amber-glow",
            animated && "audio-bar",
          )}
          key={index}
          style={{
            animationDelay: `${(index % 9) * 90}ms`,
            height: `${22 + ((index * 17) % 58)}%`,
          }}
        />
      ))}
    </div>
  );
}
