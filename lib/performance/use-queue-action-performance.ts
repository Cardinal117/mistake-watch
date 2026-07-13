"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  completeQueuePerformanceMeasure,
  startQueuePerformanceMeasure,
  type QueuePerformanceMeasure,
} from "./queue";

type PendingQueueAction = {
  measure: QueuePerformanceMeasure;
  timeoutId: number;
};

export function useQueueActionPerformance(queueRevision: unknown) {
  const previousRevisionRef = useRef(queueRevision);
  const pendingRef = useRef<PendingQueueAction | null>(null);

  const finishPending = useCallback((status: string) => {
    const pending = pendingRef.current;

    if (!pending) {
      return;
    }

    window.clearTimeout(pending.timeoutId);
    completeQueuePerformanceMeasure(pending.measure, { status });
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    if (previousRevisionRef.current !== queueRevision) {
      finishPending("committed");
      previousRevisionRef.current = queueRevision;
    }
  }, [finishPending, queueRevision]);

  useEffect(
    () => () => {
      finishPending("unmounted");
    },
    [finishPending],
  );

  return useCallback(
    (label: string, action: () => void) => {
      finishPending("superseded");
      const measure = startQueuePerformanceMeasure(`action:${label}`);

      try {
        action();
      } catch (error) {
        completeQueuePerformanceMeasure(measure, { status: "failed" });
        throw error;
      }

      if (!measure) {
        return;
      }

      pendingRef.current = {
        measure,
        timeoutId: window.setTimeout(() => finishPending("timeout"), 10_000),
      };
    },
    [finishPending],
  );
}
