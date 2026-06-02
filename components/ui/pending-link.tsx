"use client";

import Link from "next/link";
import { useState, type ComponentProps, type MouseEvent } from "react";

import { markRoomTransition } from "@/lib/performance/room-transition";
import { RoomTransitionOverlay } from "./room-transition-overlay";

type PendingLinkProps = ComponentProps<typeof Link> & {
  loadingDetail?: string;
  loadingLabel: string;
  tone?: "amber" | "cyan";
};

export function PendingLink({
  loadingDetail,
  loadingLabel,
  onClick,
  target,
  tone = "cyan",
  ...props
}: PendingLinkProps) {
  const [pending, setPending] = useState(false);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank"
    ) {
      return;
    }

    setPending(true);
    markRoomTransition(loadingLabel);
  }

  return (
    <>
      <RoomTransitionOverlay
        active={pending}
        detail={loadingDetail}
        label={loadingLabel}
        tone={tone}
      />
      <Link {...props} onClick={handleClick} target={target} />
    </>
  );
}
