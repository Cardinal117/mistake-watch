"use client";

import Link from "next/link";
import { type ComponentProps, type MouseEvent } from "react";
import { useRoomTransitions } from "./room-loading/provider";

import { markRoomTransition } from "@/lib/performance/room-transition";

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
  tone: _tone = "cyan",
  ...props
}: PendingLinkProps) {
  const transitions = useRoomTransitions();

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

    const href =
      typeof props.href === "string" ? props.href : props.href.pathname;
    if (!href) return;
    const destination = new URL(href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      destination.pathname === window.location.pathname
    )
      return;
    transitions?.begin({
      kind: "navigation",
      path: destination.pathname,
      label: loadingLabel,
      detail: loadingDetail,
      pending: false,
    });
    markRoomTransition(loadingLabel);
  }

  return (
    <>
      <Link {...props} onClick={handleClick} target={target} />
    </>
  );
}
