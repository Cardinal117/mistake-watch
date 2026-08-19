"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RoomQueueItem } from "@/lib/rooms";
import { recommendationMediaKey } from "./media-identity";
import {
  fetchRoomMediaPreferences,
  preferenceRateLimitCooldownMs,
  PreferenceReadError,
  PreferenceMutationError,
  queueItemRecommendationIdentity,
  updateRoomMediaPreference,
} from "./room-client";
import {
  indexMediaPreferences,
  reconcileMediaPreferences,
  shouldApplyPreferenceSnapshot,
  type MediaPreferenceMap,
} from "./media-preference-reconciliation";

const PREFERENCE_RECONCILE_INTERVAL_MS = 10_000;
const PREFERENCE_ACTIVITY_THROTTLE_MS = 2_000;

export type MediaPreferenceView = {
  available: boolean;
  error: string | null;
  liked: boolean;
  pending: boolean;
  revision: number;
};

export type MediaPreferenceController = {
  getPreference(item: RoomQueueItem | null): MediaPreferenceView;
  revision: number;
  togglePreference(item: RoomQueueItem): Promise<void>;
};

export function useMediaPreferences({
  allowUploaded,
  roomId,
}: {
  allowUploaded: boolean;
  roomId: string;
}) {
  const [preferences, setPreferences] = useState<MediaPreferenceMap>({});
  const [loadedRoomId, setLoadedRoomId] = useState(roomId);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rankingRevision, setRankingRevision] = useState(0);
  const roomIdRef = useRef(roomId);
  const preferencesRef = useRef<MediaPreferenceMap>({});
  const pendingKeysRef = useRef<Set<string>>(new Set());
  const mutationGenerationRef = useRef(0);
  const requestSequenceRef = useRef(0);
  const lastRefreshStartedAtRef = useRef(0);
  const lastAppliedRoomIdRef = useRef<string | null>(null);
  const activeRefreshRef = useRef<{ roomId: string; sequence: number } | null>(
    null,
  );
  const cooldownRef = useRef<{ roomId: string; until: number } | null>(null);
  const rateLimitFailuresRef = useRef<{ count: number; roomId: string } | null>(
    null,
  );

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    let disposed = false;

    mutationGenerationRef.current += 1;
    pendingKeysRef.current = new Set();

    async function refreshPreferences(force = false) {
      const now = Date.now();
      const activeRefresh = activeRefreshRef.current;
      const cooldown = cooldownRef.current;

      if (activeRefresh?.roomId === roomId) {
        return;
      }

      if (cooldown?.roomId === roomId && now < cooldown.until) {
        return;
      }

      if (
        !force &&
        now - lastRefreshStartedAtRef.current < PREFERENCE_ACTIVITY_THROTTLE_MS
      ) {
        return;
      }

      lastRefreshStartedAtRef.current = now;
      const requestSequence = requestSequenceRef.current + 1;
      const requestMutationGeneration = mutationGenerationRef.current;
      requestSequenceRef.current = requestSequence;
      activeRefreshRef.current = { roomId, sequence: requestSequence };

      try {
        const items = await fetchRoomMediaPreferences(roomId);

        if (rateLimitFailuresRef.current?.roomId === roomId) {
          rateLimitFailuresRef.current = null;
          cooldownRef.current = null;
        }

        if (
          disposed ||
          !shouldApplyPreferenceSnapshot({
            currentMutationGeneration: mutationGenerationRef.current,
            currentRoomId: roomIdRef.current,
            latestRequestSequence: requestSequenceRef.current,
            requestMutationGeneration,
            requestRoomId: roomId,
            requestSequence,
          })
        ) {
          return;
        }

        const result = reconcileMediaPreferences({
          current: preferencesRef.current,
          incoming: indexMediaPreferences(items),
          pendingKeys: pendingKeysRef.current,
        });
        const roomChanged = lastAppliedRoomIdRef.current !== roomId;

        if (result.changed) {
          preferencesRef.current = result.preferences;
          setPreferences(result.preferences);
        }

        lastAppliedRoomIdRef.current = roomId;
        if (roomChanged) {
          setPendingKeys(new Set());
          setBlockedKeys(new Set());
          setErrors({});
        }
        setLoadedRoomId(roomId);
        if (result.changed || roomChanged) {
          setRankingRevision((current) => current + 1);
        }
      } catch (error) {
        if (error instanceof PreferenceReadError && error.status === 429) {
          const failureCount =
            rateLimitFailuresRef.current?.roomId === roomId
              ? rateLimitFailuresRef.current.count + 1
              : 1;
          rateLimitFailuresRef.current = { count: failureCount, roomId };
          cooldownRef.current = {
            roomId,
            until:
              Date.now() +
              preferenceRateLimitCooldownMs(error.retryAfterMs, failureCount),
          };
        }
        // Preference reconciliation is non-blocking for playback and queue use.
      } finally {
        if (
          activeRefreshRef.current?.roomId === roomId &&
          activeRefreshRef.current.sequence === requestSequence
        ) {
          activeRefreshRef.current = null;
        }
      }
    }

    function refreshOnActivity() {
      if (!document.hidden && navigator.onLine) {
        void refreshPreferences();
      }
    }

    void refreshPreferences(true);
    const interval = window.setInterval(
      refreshOnActivity,
      PREFERENCE_RECONCILE_INTERVAL_MS,
    );
    window.addEventListener("focus", refreshOnActivity);
    window.addEventListener("online", refreshOnActivity);
    document.addEventListener("visibilitychange", refreshOnActivity);

    return () => {
      disposed = true;
      requestSequenceRef.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnActivity);
      window.removeEventListener("online", refreshOnActivity);
      document.removeEventListener("visibilitychange", refreshOnActivity);
    };
  }, [roomId]);

  const getPreference = useCallback(
    (item: RoomQueueItem | null): MediaPreferenceView => {
      const identity = queueItemRecommendationIdentity(item);

      if (!identity) {
        return unavailablePreference("Like unavailable for this media.");
      }

      const key = recommendationMediaKey(identity);
      const hasCurrentRoomState = loadedRoomId === roomId;
      const isUploaded = identity.sourceType === "uploaded";
      const blocked =
        (hasCurrentRoomState && blockedKeys.has(key)) ||
        (isUploaded && !allowUploaded);
      const current = hasCurrentRoomState ? preferences[key] : undefined;
      const error = hasCurrentRoomState ? errors[key] : undefined;

      return {
        available: !blocked,
        error: blocked
          ? (error ?? "Like unavailable for this media.")
          : (error ?? null),
        liked: current?.liked ?? false,
        pending: hasCurrentRoomState && pendingKeys.has(key),
        revision: current?.revision ?? 0,
      };
    },
    [
      allowUploaded,
      blockedKeys,
      errors,
      loadedRoomId,
      pendingKeys,
      preferences,
      roomId,
    ],
  );

  const togglePreference = useCallback(
    async (item: RoomQueueItem) => {
      const identity = queueItemRecommendationIdentity(item);

      if (!identity) {
        return;
      }

      const key = recommendationMediaKey(identity);
      const hasCurrentRoomState = loadedRoomId === roomId;
      const current = (hasCurrentRoomState
        ? preferencesRef.current[key]
        : undefined) ?? {
        ...identity,
        liked: false,
        mediaKey: key,
        revision: 0,
      };

      if (
        (hasCurrentRoomState && pendingKeysRef.current.has(key)) ||
        (hasCurrentRoomState && blockedKeys.has(key)) ||
        (identity.sourceType === "uploaded" && !allowUploaded)
      ) {
        return;
      }

      const optimistic = { ...current, liked: !current.liked };
      const optimisticPreferences = {
        ...(hasCurrentRoomState ? preferencesRef.current : {}),
        [key]: optimistic,
      };
      const nextPendingKeys = new Set(
        hasCurrentRoomState ? pendingKeysRef.current : [],
      ).add(key);

      mutationGenerationRef.current += 1;
      preferencesRef.current = optimisticPreferences;
      pendingKeysRef.current = nextPendingKeys;
      setPreferences(optimisticPreferences);
      setPendingKeys(nextPendingKeys);
      setErrors((state) => ({
        ...(hasCurrentRoomState ? state : {}),
        [key]: "",
      }));
      if (!hasCurrentRoomState) {
        setBlockedKeys(new Set());
        setLoadedRoomId(roomId);
      }

      try {
        const updated = await updateRoomMediaPreference({
          actionId: crypto.randomUUID(),
          expectedRevision: current.revision,
          liked: optimistic.liked,
          mediaId: identity.mediaId,
          roomId,
          sourceType: identity.sourceType,
        });
        if (roomIdRef.current !== roomId) {
          return;
        }
        const updatedPreferences = {
          ...preferencesRef.current,
          [key]: updated,
        };

        mutationGenerationRef.current += 1;
        preferencesRef.current = updatedPreferences;
        setPreferences(updatedPreferences);
        setRankingRevision((state) => state + 1);
      } catch (error) {
        if (roomIdRef.current !== roomId) {
          return;
        }
        const mutationError =
          error instanceof PreferenceMutationError ? error : null;
        const restoredPreferences = {
          ...preferencesRef.current,
          [key]: mutationError?.current ?? current,
        };

        mutationGenerationRef.current += 1;
        preferencesRef.current = restoredPreferences;
        setPreferences(restoredPreferences);
        setErrors((state) => ({
          ...state,
          [key]: mutationError?.message ?? "Like could not be updated.",
        }));

        if (mutationError?.status === 403) {
          setBlockedKeys((state) => new Set(state).add(key));
        }
      } finally {
        if (roomIdRef.current === roomId) {
          const nextPendingKeys = new Set(pendingKeysRef.current);
          nextPendingKeys.delete(key);
          pendingKeysRef.current = nextPendingKeys;
          setPendingKeys(nextPendingKeys);
        }
      }
    },
    [allowUploaded, blockedKeys, loadedRoomId, roomId],
  );

  return useMemo<MediaPreferenceController>(
    () => ({ getPreference, revision: rankingRevision, togglePreference }),
    [getPreference, rankingRevision, togglePreference],
  );
}

function unavailablePreference(error: string): MediaPreferenceView {
  return {
    available: false,
    error,
    liked: false,
    pending: false,
    revision: 0,
  };
}
