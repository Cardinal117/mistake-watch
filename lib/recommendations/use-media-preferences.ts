"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RoomQueueItem } from "@/lib/rooms";
import { recommendationMediaKey } from "./media-identity";
import {
  fetchRoomMediaPreferences,
  PreferenceMutationError,
  queueItemRecommendationIdentity,
  updateRoomMediaPreference,
  type ClientMediaPreference,
} from "./room-client";

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
  const [preferences, setPreferences] = useState<
    Record<string, ClientMediaPreference>
  >({});
  const [loadedRoomId, setLoadedRoomId] = useState(roomId);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rankingRevision, setRankingRevision] = useState(0);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;

    void fetchRoomMediaPreferences(roomId)
      .then((items) => {
        if (!cancelled) {
          setPreferences(
            Object.fromEntries(items.map((item) => [item.mediaKey, item])),
          );
          setLoadedRoomId(roomId);
          setRankingRevision((current) => current + 1);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
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
      const current = (hasCurrentRoomState ? preferences[key] : undefined) ?? {
        ...identity,
        liked: false,
        mediaKey: key,
        revision: 0,
      };

      if (
        (hasCurrentRoomState && pendingKeys.has(key)) ||
        (hasCurrentRoomState && blockedKeys.has(key)) ||
        (identity.sourceType === "uploaded" && !allowUploaded)
      ) {
        return;
      }

      const optimistic = { ...current, liked: !current.liked };
      setPreferences((state) => ({
        ...(hasCurrentRoomState ? state : {}),
        [key]: optimistic,
      }));
      setPendingKeys((state) =>
        new Set(hasCurrentRoomState ? state : []).add(key),
      );
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
        setPreferences((state) => ({ ...state, [key]: updated }));
        setRankingRevision((state) => state + 1);
      } catch (error) {
        if (roomIdRef.current !== roomId) {
          return;
        }
        const mutationError =
          error instanceof PreferenceMutationError ? error : null;
        setPreferences((state) => ({
          ...state,
          [key]: mutationError?.current ?? current,
        }));
        setErrors((state) => ({
          ...state,
          [key]: mutationError?.message ?? "Like could not be updated.",
        }));

        if (mutationError?.status === 403) {
          setBlockedKeys((state) => new Set(state).add(key));
        }
      } finally {
        if (roomIdRef.current === roomId) {
          setPendingKeys((state) => {
            const next = new Set(state);
            next.delete(key);
            return next;
          });
        }
      }
    },
    [
      allowUploaded,
      blockedKeys,
      loadedRoomId,
      pendingKeys,
      preferences,
      roomId,
    ],
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
