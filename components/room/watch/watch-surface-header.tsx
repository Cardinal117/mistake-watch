"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { IconButton } from "@/components/ui";

export function WatchSurfaceHeader({
  eyebrow,
  icon,
  onClose,
  title,
}: {
  eyebrow: string;
  icon: ReactNode;
  onClose(): void;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-background/28 p-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-primary-fixed-dim/25 bg-primary-fixed-dim/10 text-primary-fixed-dim">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="technical-label text-primary-fixed-dim">{eyebrow}</p>
          <h2 className="truncate text-body-md font-semibold text-on-surface">
            {title}
          </h2>
        </div>
      </div>
      <IconButton label={`Close ${title}`} onClick={onClose} variant="ghost">
        <X className="h-5 w-5" aria-hidden />
      </IconButton>
    </div>
  );
}
