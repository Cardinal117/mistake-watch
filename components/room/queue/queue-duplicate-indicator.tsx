import { Copy } from "lucide-react";

export function QueueDuplicateIndicator({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-label-sm text-on-surface-variant"
      role="img"
      aria-label={`${count} copies in queue`}
      title={`${count} copies in queue`}
    >
      <Copy size={13} aria-hidden />
      <span aria-hidden>{count}</span>
    </span>
  );
}
