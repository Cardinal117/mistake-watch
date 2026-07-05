import { SignalSkeleton } from "@/components/ui";
import { cx } from "@/lib/ui";

type MetadataPlaceholderChipsProps = {
  className?: string;
  compact?: boolean;
  showChannel?: boolean;
};

export function MetadataPlaceholderChips({
  className,
  compact = false,
  showChannel = true,
}: MetadataPlaceholderChipsProps) {
  return (
    <div
      aria-label="Loading metadata"
      className={cx(
        "flex min-w-0 flex-wrap items-center gap-1.5",
        compact && "gap-x-2",
        className,
      )}
      role="status"
    >
      {showChannel ? (
        <SignalSkeleton
          aria-label="Loading channel"
          className="h-6 w-24 p-0"
          lines={1}
        />
      ) : null}
      <SignalSkeleton
        aria-label="Loading source"
        className="h-6 w-20 p-0"
        lines={1}
      />
      <SignalSkeleton
        aria-label="Loading views"
        className="h-6 w-24 p-0"
        lines={1}
      />
      <SignalSkeleton
        aria-label="Loading likes"
        className="h-6 w-24 p-0"
        lines={1}
      />
    </div>
  );
}
