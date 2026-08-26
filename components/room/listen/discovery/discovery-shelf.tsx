"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { ListenDiscoveryShelf as DiscoveryShelfModel } from "@/lib/recommendations/listen-discovery";

export function DiscoveryShelf({
  children,
  onBrowseAll,
  shelf,
}: {
  children: ReactNode;
  onBrowseAll(trigger: HTMLButtonElement): void;
  shelf: DiscoveryShelfModel;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  function updateScrollState() {
    const rail = railRef.current;

    if (!rail) {
      setScrollState({ left: false, right: false });
      return;
    }

    setScrollState({
      left: rail.scrollLeft > 4,
      right: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
    });
  }

  useEffect(() => {
    const rail = railRef.current;

    updateScrollState();
    if (!rail || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [shelf.items.length]);

  function scroll(direction: "left" | "right") {
    const rail = railRef.current;

    rail?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -rail.clientWidth : rail.clientWidth,
    });
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    scroll(event.key === "ArrowLeft" ? "left" : "right");
  }

  const headingId = `listen-discovery-${shelf.id}`;

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <header className="flex min-w-0 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3
            className="truncate text-title-sm font-semibold text-on-surface"
            id={headingId}
            title={shelf.title}
          >
            {shelf.title}
          </h3>
          {shelf.message ? (
            <p className="mt-0.5 line-clamp-2 text-label-sm text-on-surface-variant">
              {shelf.message}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={`Scroll ${shelf.title} left`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-background/48 text-on-surface-variant transition hover:border-[rgb(var(--listen-primary)/0.35)] hover:text-[rgb(var(--listen-primary))] disabled:opacity-30"
            disabled={!scrollState.left}
            onClick={() => scroll("left")}
            title={`Scroll ${shelf.title} left`}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            aria-label={`Scroll ${shelf.title} right`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-background/48 text-on-surface-variant transition hover:border-[rgb(var(--listen-primary)/0.35)] hover:text-[rgb(var(--listen-primary))] disabled:opacity-30"
            disabled={!scrollState.right}
            onClick={() => scroll("right")}
            title={`Scroll ${shelf.title} right`}
            type="button"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            className="ml-1 inline-flex h-8 items-center gap-1 rounded-md px-2 text-label-sm font-semibold text-on-surface-variant transition hover:bg-white/5 hover:text-[rgb(var(--listen-primary))]"
            id={`listen-discovery-browse-${shelf.id}`}
            onClick={(event) => onBrowseAll(event.currentTarget)}
            type="button"
          >
            Browse all
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>
      <div
        className="grid snap-x snap-mandatory auto-cols-[84%] grid-flow-col gap-2.5 overflow-x-auto pb-1.5 pr-[12%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[minmax(14rem,42%)] sm:pr-[14%] lg:auto-cols-[14.5rem] lg:pr-[8%] 2xl:auto-cols-[14.5rem] 2xl:pr-6"
        onKeyDown={handleRailKeyDown}
        onScroll={updateScrollState}
        ref={railRef}
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  );
}

export function DiscoveryShelfSkeleton() {
  return (
    <section aria-label="Loading recommendations" className="grid gap-2.5">
      <div className="h-5 w-56 animate-pulse rounded-sm bg-white/8" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className="h-[8.5rem] animate-pulse rounded-md border border-white/8 bg-white/4"
            key={index}
          />
        ))}
      </div>
    </section>
  );
}
