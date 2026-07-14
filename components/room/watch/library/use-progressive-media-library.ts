"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import {
  getCatalogueBatchSize,
  getNextCatalogueCount,
  getProgressiveCatalogueWindow,
} from "@/lib/media/catalogue-window";
import type { UploadedLibraryViewMode } from "../contracts";

export function useProgressiveMediaLibrary({
  itemCount,
  resetKey,
  scrollRootRef,
  viewMode,
}: {
  itemCount: number;
  resetKey: string;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  viewMode: UploadedLibraryViewMode;
}) {
  const batchSize = getCatalogueBatchSize(viewMode);
  const [progress, setProgress] = useState(() => ({
    requestedCount: batchSize,
    resetKey,
  }));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestedCount =
    progress.resetKey === resetKey ? progress.requestedCount : batchSize;
  const catalogueWindow = getProgressiveCatalogueWindow({
    itemCount,
    requestedCount,
    viewMode,
  });

  const revealNextBatch = useCallback(() => {
    setProgress((current) => {
      const currentCount =
        current.resetKey === resetKey
          ? current.requestedCount
          : getCatalogueBatchSize(viewMode);

      return {
        requestedCount: getNextCatalogueCount({
          currentCount,
          itemCount,
          viewMode,
        }),
        resetKey,
      };
    });
  }, [itemCount, resetKey, viewMode]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !catalogueWindow.hasMore) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => {
        setProgress({ requestedCount: itemCount, resetKey });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          revealNextBatch();
        }
      },
      {
        root: scrollRootRef.current,
        rootMargin: "120px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    catalogueWindow.hasMore,
    catalogueWindow.visibleCount,
    itemCount,
    resetKey,
    revealNextBatch,
    scrollRootRef,
  ]);

  return {
    hasMore: catalogueWindow.hasMore,
    sentinelRef,
    visibleCount: catalogueWindow.visibleCount,
  };
}
