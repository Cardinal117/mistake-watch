type AudioVisualizerProps = {
  bars?: number;
  className?: string;
};

export function AudioVisualizer({ bars = 28, className }: AudioVisualizerProps) {
  return (
    <div
      aria-hidden
      className={`flex h-24 items-end justify-center gap-1.5 overflow-hidden ${className ?? ""}`}
    >
      {Array.from({ length: bars }).map((_, index) => (
        <span
          className="audio-bar w-1.5 rounded-sm bg-secondary-fixed-dim/80 shadow-amber-glow"
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
