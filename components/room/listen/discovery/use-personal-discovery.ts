"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomQueueItem } from "@/lib/rooms";
import type {
  DiscoverItem,
  DiscoverFeedback,
  DiscoverFeedbackState,
  DiscoverMutation,
  DiscoverResponse,
  DiscoverSurface,
} from "@/lib/recommendations/discover-contracts";
import { queuedPersonalTrack } from "@/lib/recommendations/personal-discovery-model";
import { queueItemToDiscoveryQueueCommand } from "@/lib/recommendations/listen-discovery-interactions";
import type { QueueAddInput } from "../shared";

function removeExpiredMetadata(value: DiscoverResponse): DiscoverResponse {
  const now = Date.now();
  const fresh = (item: DiscoverItem) =>
    item.metadataExpiresAt === undefined ||
    Date.parse(item.metadataExpiresAt) > now;
  return {
    ...value,
    items: value.items.filter(fresh),
    ...(value.recommendations
      ? { recommendations: value.recommendations.filter(fresh) }
      : {}),
  };
}

function recommendationDecision(
  value: DiscoverResponse | null,
  mediaId: string,
  surface: DiscoverSurface,
) {
  if (
    surface !== "recommended" ||
    !value?.recommendations?.some((item) => item.mediaId === mediaId)
  )
    return undefined;
  if (
    value.decisionExpiresAt &&
    Date.parse(value.decisionExpiresAt) <= Date.now()
  )
    return undefined;
  return value.decisionId;
}

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
  const dismissUndo = useCallback(() => setUndo(null), []);
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
        decisionId: string | null;
        existingOccurrenceIds: Set<string>;
        token: symbol;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const feedbackLock = useRef(false);
  // Provider cache expiry applies to already-mounted results, including while
  // a refresh is stalled or the tab is offline. Re-arm long timers safely.
  useEffect(() => {
    if (!data) return;
    const expiries = [...data.items, ...(data.recommendations ?? [])]
      .flatMap((item) =>
        item.metadataExpiresAt ? [Date.parse(item.metadataExpiresAt)] : [],
      )
      .filter(Number.isFinite);
    if (!expiries.length) return;
    const timer = setTimeout(
      () => {
        setData((current) => {
          if (!current) return current;
          const fresh = removeExpiredMetadata(current);
          dataRef.current = fresh;
          return fresh;
        });
      },
      Math.min(2_147_483_647, Math.max(0, Math.min(...expiries) - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [data]);
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
        const fresh = removeExpiredMetadata(body);
        dataRef.current = fresh;
        setData(fresh);
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
      capturedDecisionId?: string | null,
    ) => {
      const current = dataRef.current;
      if (
        surface === "recommended" &&
        capturedDecisionId === undefined &&
        !current?.recommendations?.some((item) => item.mediaId === mediaId)
      )
        return;
      const decisionId =
        surface === "recommended"
          ? capturedDecisionId === undefined
            ? recommendationDecision(current, mediaId, surface)
            : (capturedDecisionId ?? undefined)
          : undefined;
      if (kind === "shown") {
        const key = `${decisionId ?? "legacy"}:${surface}:${mediaId}`;
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
          ...(decisionId ? { decisionId } : {}),
        }),
      }).catch(() => {
        /* Telemetry must not interrupt ordinary listening. */
      });
    },
    [roomId],
  );

  useEffect(() => {
    for (const [mediaId, request] of inFlight.current) {
      if (
        !queuedPersonalTrack(
          request.item,
          queue.filter((item) => !request.existingOccurrenceIds.has(item.id)),
        )
      )
        continue;
      clearTimeout(request.timer);
      inFlight.current.delete(mediaId);
      setPending((current) => {
        const next = new Set(current);
        next.delete(mediaId);
        return next;
      });
      setAdded((current) => new Set(current).add(mediaId));
      observe(mediaId, request.surface, "queue_observed", request.decisionId);
    }
  }, [queue, observe]);

  function addTrack(
    item: RoomQueueItem,
    surface: DiscoverSurface,
    next = false,
  ) {
    const mediaId = item.videoId;
    if (!mediaId || inFlight.current.has(mediaId)) return;
    setActionError(null);
    const token = Symbol("queue-add");
    const fail = (message: string) => {
      const entry = inFlight.current.get(mediaId);
      if (!entry || entry.token !== token) return;
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
    const decisionId =
      recommendationDecision(dataRef.current, mediaId, surface) ?? null;
    inFlight.current.set(mediaId, {
      item,
      surface,
      timer,
      decisionId,
      existingOccurrenceIds: new Set(queue.map((entry) => entry.id)),
      token,
    });
    setPending((current) => new Set(current).add(mediaId));
    observe(
      mediaId,
      surface,
      next ? "play_next_requested" : "add_requested",
      decisionId,
    );
    try {
      // A resolved request alone is not evidence that the live queue accepted it.
      void Promise.resolve(
        add({
          ...queueItemToDiscoveryQueueCommand(item, { isPlayNext: next }),
          allowDuplicate: true,
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
    const decisionId = recommendationDecision(
      dataRef.current,
      mediaId,
      surface,
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
          ...(decisionId ? { decisionId } : {}),
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
    dismissUndo,
    feedback,
    busyFeedback,
    addTrack,
    pending,
    added,
    observe,
  };
}
