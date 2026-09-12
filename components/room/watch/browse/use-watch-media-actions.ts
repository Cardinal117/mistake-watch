"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import { createUploadedPlaybackSessionReference } from "@/lib/media/uploaded-room-session-client";
import type { LiveRoomState } from "@/lib/spacetime";
import type { WatchMediaHubItem } from "../contracts";
import { parseDurationSeconds } from "../presentation";

export type WatchMediaAction = "play" | "next" | "add";
export type WatchPlayCoordinator = ReturnType<typeof useWatchPlayCoordinator>;

export function useWatchPlayCoordinator(liveRoom: LiveRoomState) {
  const generation = useRef(0);
  const mounted = useRef(true);
  const currentRoom = useRef(liveRoom);
  const pendingStart = useRef<{
    generation: number;
    sourceUrl: string;
  } | null>(null);

  useLayoutEffect(() => {
    const previousRoom = currentRoom.current;
    if (
      previousRoom.connectionStatus !== liveRoom.connectionStatus ||
      previousRoom.canControlPlayback !== liveRoom.canControlPlayback ||
      previousRoom.canManageAuthority !== liveRoom.canManageAuthority
    ) {
      generation.current += 1;
      pendingStart.current = null;
    }
    currentRoom.current = liveRoom;
  }, [liveRoom]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      pendingStart.current = null;
    };
  }, []);

  useEffect(() => {
    const pending = pendingStart.current;
    if (!pending) return;
    if (
      pending.generation !== generation.current ||
      liveRoom.connectionStatus !== "connected" ||
      !liveRoom.canControlPlayback ||
      !liveRoom.canManageAuthority
    ) {
      pendingStart.current = null;
      return;
    }
    if (liveRoom.snapshot.session?.sourceUrl === pending.sourceUrl) {
      pendingStart.current = null;
      liveRoom.setPlaybackState({ positionSeconds: 0, status: "playing" });
    }
  }, [liveRoom]);

  return {
    begin() {
      generation.current += 1;
      pendingStart.current = null;
      return generation.current;
    },
    isCurrent(requestGeneration: number) {
      return mounted.current && requestGeneration === generation.current;
    },
    admit(
      requestGeneration: number,
      input: {
        sourceTitle: string;
        sourceType: "direct" | "hls" | "youtube";
        sourceUrl: string;
      },
    ) {
      const room = currentRoom.current;
      if (
        !mounted.current ||
        requestGeneration !== generation.current ||
        room.connectionStatus !== "connected" ||
        !room.canManageAuthority ||
        !room.canControlPlayback
      )
        return false;
      pendingStart.current = {
        generation: requestGeneration,
        sourceUrl: input.sourceUrl,
      };
      room.loadMediaSource(input);
      return true;
    },
  };
}

export function useWatchMediaActions({
  item,
  liveRoom,
  playCoordinator,
  roomId,
}: {
  item: WatchMediaHubItem;
  liveRoom: LiveRoomState;
  playCoordinator: WatchPlayCoordinator;
  roomId: string;
}) {
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const connected = liveRoom.connectionStatus === "connected";
  const available = Boolean(
    item.sourceUrl && item.sourceType && !item.isUnavailable,
  );
  const queued = liveRoom.snapshot.queue.some(
    (queueItem) =>
      queueItem.queueItemId === item.id && queueItem.status === "queued",
  );
  const canPlay =
    connected &&
    available &&
    (item.status === "library"
      ? liveRoom.canManageAuthority && liveRoom.canControlPlayback
      : liveRoom.canControlPlayback);
  const canAdd = connected && available && liveRoom.canAddQueue;
  const canNext =
    connected &&
    available &&
    (queued ? liveRoom.canManageQueue : liveRoom.canAddQueue);

  async function act(action: WatchMediaAction) {
    if (
      pending ||
      !(action === "play" ? canPlay : action === "next" ? canNext : canAdd)
    )
      return;
    setPending(true);
    setNotice("");
    try {
      if (action === "play") {
        const requestGeneration = playCoordinator.begin();
        const assetId = parseUploadedAssetReference(item.sourceUrl);
        if (
          item.status !== "library" &&
          liveRoom.snapshot.queue.some(
            (queueItem) => queueItem.queueItemId === item.id,
          )
        ) {
          await liveRoom.playQueueItemNow(item.id, {
            isCurrent: () => playCoordinator.isCurrent(requestGeneration),
          });
        } else {
          const sourceUrl = assetId
            ? await createUploadedPlaybackSessionReference({ assetId, roomId })
            : item.sourceUrl!;
          if (
            !playCoordinator.admit(requestGeneration, {
              sourceTitle: item.title,
              sourceType: item.sourceType!,
              sourceUrl,
            })
          )
            return;
        }
      } else if (action === "next" && queued) {
        liveRoom.setQueueItemPriority(item.id, { isPlayNext: true });
      } else {
        liveRoom.addQueueItem({
          allowDuplicate: true,
          sourceTitle: item.title,
          sourceType: item.sourceType!,
          sourceUrl: item.sourceUrl!,
          thumbnailUrl: item.thumbnailUrl,
          durationSeconds:
            item.durationSeconds ?? parseDurationSeconds(item.duration),
          artist: item.artist,
          channelName: item.channelName,
          isPlayNext: action === "next",
        });
      }
      if (mounted.current)
        setNotice(
          action === "play"
            ? "Playback requested for the room."
            : action === "next"
              ? "Play next requested. This item will be first in the upcoming queue."
              : "Add to queue requested.",
        );
    } catch (error) {
      if (mounted.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "The room action could not be completed.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return { act, canAdd, canNext, canPlay, notice, pending };
}
