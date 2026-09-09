"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomQueueItem } from "@/lib/rooms";
import type {
  DiscoverFeedback,
  DiscoverFeedbackState,
  DiscoverMutation,
  DiscoverResponse,
  DiscoverSurface,
} from "@/lib/recommendations/discover-contracts";
import { queuedPersonalTrack } from "@/lib/recommendations/personal-discovery-model";
import { queueItemToDiscoveryQueueCommand } from "@/lib/recommendations/listen-discovery-interactions";
import type { QueueAddInput } from "../shared";

export function usePersonalDiscovery(
  roomId: string,
  queue: RoomQueueItem[],
  add: (input: QueueAddInput) => void,
  preferenceRevision = 0,
) {
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [undo, setUndo] = useState<DiscoverFeedback | null>(null);
  const [busyFeedback, setBusyFeedback] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const dataRef = useRef(data);
  const mounted = useRef(true);
  const requestVersion = useRef(0);
  const mutationVersion = useRef(0);
  const observed = useRef(new Set<string>());
  const inFlight = useRef(
    new Map<
      string,
      {
        item: RoomQueueItem;
        surface: DiscoverSurface;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const feedbackLock = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const pendingRequests = inFlight.current;
    return () => {
      mounted.current = false;
      for (const p of pendingRequests.values()) clearTimeout(p.timer);
      pendingRequests.clear();
    };
  }, []);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const mutation = mutationVersion.current;
    try {
      const response = await fetch(
        `/api/recommendations/discover?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok || body.status !== "available")
        throw new Error(
          body.reason ?? "Your listening history is unavailable. Try again.",
        );
      if (
        mounted.current &&
        version === requestVersion.current &&
        mutation === mutationVersion.current
      ) {
        dataRef.current = body;
        setData(body);
        setError(null);
      }
    } catch (err) {
      if (
        mounted.current &&
        version === requestVersion.current &&
        mutation === mutationVersion.current
      ) {
        dataRef.current = null;
        setData(null);
        setError(
          err instanceof Error ? err.message : "Discover is unavailable.",
        );
      }
    }
  }, [roomId]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const whenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = setInterval(whenVisible, 30_000);
    window.addEventListener("focus", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener("focus", whenVisible);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [refresh, preferenceRevision]);

  const observe = useCallback(
    (
      mediaId: string,
      surface: DiscoverSurface,
      kind: DiscoverMutation["kind"],
    ) => {
      if (kind === "shown") {
        const key = `${surface}:${mediaId}`;
        if (observed.current.has(key)) return;
        observed.current.add(key);
      }
      // Diagnostic observations are never authoritative queue/learning facts.
      void fetch("/api/recommendations/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          mediaId,
          surface,
          kind,
          actionId: crypto.randomUUID(),
        }),
      }).catch(() => {
        /* Telemetry must not interrupt ordinary listening. */
      });
    },
    [roomId],
  );

  useEffect(() => {
    for (const [mediaId, request] of inFlight.current) {
      if (!queuedPersonalTrack(request.item, queue)) continue;
      clearTimeout(request.timer);
      inFlight.current.delete(mediaId);
      setPending((current) => {
        const next = new Set(current);
        next.delete(mediaId);
        return next;
      });
      setAdded((current) => new Set(current).add(mediaId));
      observe(mediaId, request.surface, "queue_observed");
    }
  }, [queue, observe]);

  function addTrack(
    item: RoomQueueItem,
    surface: DiscoverSurface,
    next = false,
  ) {
    const mediaId = item.videoId;
    if (
      !mediaId ||
      inFlight.current.has(mediaId) ||
      queuedPersonalTrack(item, queue)
    )
      return;
    setActionError(null);
    const fail = (message: string) => {
      const entry = inFlight.current.get(mediaId);
      if (!entry) return;
      clearTimeout(entry.timer);
      inFlight.current.delete(mediaId);
      if (mounted.current) {
        setPending((current) => {
          const result = new Set(current);
          result.delete(mediaId);
          return result;
        });
        setActionError(message);
      }
    };
    const timer = setTimeout(
      () =>
        fail(
          "Queue addition was not confirmed. Check your connection and try again.",
        ),
      12_000,
    );
    inFlight.current.set(mediaId, { item, surface, timer });
    setPending((current) => new Set(current).add(mediaId));
    observe(mediaId, surface, next ? "play_next_requested" : "add_requested");
    try {
      // A resolved request alone is not evidence that the live queue accepted it.
      void Promise.resolve(
        add({
          ...queueItemToDiscoveryQueueCommand(item, { isPlayNext: next }),
          allowDuplicate: false,
        }),
      ).catch(() => fail("Could not add this track. Please try again."));
    } catch {
      fail("Could not add this track. Please try again.");
    }
  }

  async function feedback(
    mediaId: string,
    surface: DiscoverSurface,
    state: DiscoverFeedbackState,
    expected?: number,
  ) {
    if (feedbackLock.current) return;
    feedbackLock.current = true;
    setBusyFeedback(true);
    setActionError(null);
    ++mutationVersion.current;
    const current = dataRef.current?.feedback.find(
      (f) => f.mediaId === mediaId,
    );
    try {
      const response = await fetch("/api/recommendations/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          mediaId,
          surface,
          kind: "feedback",
          state,
          expectedRevision: expected ?? current?.revision ?? 0,
          actionId: crypto.randomUUID(),
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.item)
        throw new Error(
          body.reason ?? "Feedback was not saved. Refresh and try again.",
        );
      if (mounted.current) {
        const value = dataRef.current;
        const updated = value
          ? {
              ...value,
              feedback: [
                ...value.feedback.filter((f) => f.mediaId !== mediaId),
                body.item,
              ],
            }
          : value;
        dataRef.current = updated;
        setData(updated);
        setUndo(state === "neutral" ? null : body.item);
      }
    } catch (err) {
      if (mounted.current)
        setActionError(
          err instanceof Error ? err.message : "Feedback was not saved.",
        );
      await refresh();
    } finally {
      ++mutationVersion.current;
      feedbackLock.current = false;
      if (mounted.current) setBusyFeedback(false);
    }
    if (mounted.current) await refresh();
  }
  return {
    data,
    error,
    refresh,
    actionError,
    undo,
    feedback,
    busyFeedback,
    addTrack,
    pending,
    added,
    observe,
  };
}
