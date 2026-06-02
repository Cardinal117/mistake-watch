"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getNextItemInvalidationKey,
  getNextItemPreparationCacheKey,
  prepareNextItem,
  predictNextQueueItem,
  toNextItemPreparationTarget,
  type NextItemPreparationResult,
  type NextItemPreparationTarget,
} from "@/lib/player/next-item-preparation";
import type { LiveRoomState } from "@/lib/spacetime";

export type NextItemPreparationState = {
  detail: string | null;
  durationMs: number | null;
  status: "failed" | "idle" | "partial" | "preparing" | "ready" | "skipped";
  target: NextItemPreparationTarget | null;
};

const idleState: NextItemPreparationState = {
  detail: null,
  durationMs: null,
  status: "idle",
  target: null,
};

export function useNextItemPreparation(liveRoom: LiveRoomState) {
  const snapshot = liveRoom.snapshot;
  const invalidationKey = useMemo(
    () => getNextItemInvalidationKey(snapshot),
    [snapshot],
  );
  const target = useMemo(
    () => toNextItemPreparationTarget(predictNextQueueItem(snapshot)),
    [snapshot],
  );
  const targetKey = target ? getNextItemPreparationCacheKey(target) : "idle";
  const inactive = !target || liveRoom.connectionStatus !== "connected";
  const [state, setState] = useState<NextItemPreparationState>(idleState);

  useEffect(() => {
    const currentTarget = target;

    if (inactive || !currentTarget) {
      return;
    }

    const controller = new AbortController();
    const preparingTimer = window.setTimeout(() => {
      setState({
        detail: "Preparing next media.",
        durationMs: null,
        status: "preparing",
        target: currentTarget,
      });
    }, 0);

    prepareNextItem(currentTarget, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setState(toState(result));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            detail: "Next media preparation failed.",
            durationMs: null,
            status: "failed",
            target: currentTarget,
          });
        }
      });

    return () => {
      window.clearTimeout(preparingTimer);
      controller.abort();
    };
  }, [inactive, invalidationKey, target, targetKey]);

  return inactive ? idleState : state;
}

function toState(result: NextItemPreparationResult): NextItemPreparationState {
  return {
    detail: result.detail,
    durationMs: result.durationMs,
    status: result.status,
    target: result.target,
  };
}
