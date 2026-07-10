"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  bindMediaSessionActionHandlers,
  publishMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
  type MediaSessionArtworkInput,
} from "@/lib/player";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveQueueItem, LiveRoomSession } from "@/lib/spacetime";

type RoomMediaSessionInput = {
  canControlPlayback: boolean;
  currentPositionSeconds: number;
  currentQueueItem: LiveQueueItem | null;
  durationSeconds: number;
  nextQueueItem: LiveQueueItem | null;
  onNextTrack(): void;
  onPause(): void;
  onPlay(): void;
  onPreviousTrack(): void;
  onSeekTo(positionSeconds: number): void;
  onSeekRelative(deltaSeconds: number): void;
  previousQueueItem: LiveQueueItem | null;
  room: RoomSnapshot;
  session: LiveRoomSession | null;
};

const appArtwork: MediaSessionArtworkInput[] = [
  {
    sizes: "192x192",
    src: "/web-app-manifest-192x192.png",
    type: "image/png",
  },
  {
    sizes: "512x512",
    src: "/web-app-manifest-512x512.png",
    type: "image/png",
  },
];

export function useRoomMediaSession(input: RoomMediaSessionInput) {
  const actionRef = useRef({
    onNextTrack: input.onNextTrack,
    onPause: input.onPause,
    onPlay: input.onPlay,
    onPreviousTrack: input.onPreviousTrack,
    onSeekRelative: input.onSeekRelative,
    onSeekTo: input.onSeekTo,
  });

  useEffect(() => {
    actionRef.current = {
      onNextTrack: input.onNextTrack,
      onPause: input.onPause,
      onPlay: input.onPlay,
      onPreviousTrack: input.onPreviousTrack,
      onSeekRelative: input.onSeekRelative,
      onSeekTo: input.onSeekTo,
    };
  }, [
    input.onNextTrack,
    input.onPause,
    input.onPlay,
    input.onPreviousTrack,
    input.onSeekRelative,
    input.onSeekTo,
  ]);

  const title =
    input.session?.sourceTitle ??
    input.currentQueueItem?.title ??
    input.room.nowPlaying.title ??
    "Mistake Watch";
  const artist =
    input.currentQueueItem?.artist ??
    input.currentQueueItem?.channelName ??
    input.room.nowPlaying.artist ??
    sourceTypeLabel(input.session?.sourceType);
  const album = input.session?.roomName ?? input.room.name;
  const artwork = useMemo(
    () => buildArtwork(input.session, input.currentQueueItem),
    [input.currentQueueItem, input.session],
  );
  const hasNextQueueItem = Boolean(input.nextQueueItem);
  const hasPreviousQueueItem = Boolean(input.previousQueueItem);

  useEffect(() => {
    publishMediaSessionMetadata({
      album,
      artist,
      artwork,
      title,
    });
  }, [album, artist, artwork, title]);

  useEffect(() => {
    setMediaSessionPlaybackState(toMediaSessionPlaybackState(input.session?.status));
  }, [input.session?.status]);

  useEffect(() => {
    setMediaSessionPositionState({
      duration: input.durationSeconds,
      playbackRate: input.session?.playbackRate ?? 1,
      position: input.currentPositionSeconds,
    });
  }, [
    input.currentPositionSeconds,
    input.durationSeconds,
    input.session?.playbackRate,
  ]);

  useEffect(() => {
    if (!input.canControlPlayback) {
      return bindMediaSessionActionHandlers({
        nexttrack: null,
        pause: null,
        play: null,
        previoustrack: null,
        seekbackward: null,
        seekforward: null,
        seekto: null,
      });
    }

    return bindMediaSessionActionHandlers({
      nexttrack: hasNextQueueItem
        ? () => actionRef.current.onNextTrack()
        : null,
      pause: () => actionRef.current.onPause(),
      play: () => actionRef.current.onPlay(),
      previoustrack: hasPreviousQueueItem
        ? () => actionRef.current.onPreviousTrack()
        : null,
      seekbackward: (details) =>
        actionRef.current.onSeekRelative(-(details.seekOffset ?? 10)),
      seekforward: (details) =>
        actionRef.current.onSeekRelative(details.seekOffset ?? 10),
      seekto: (details) => {
        if (typeof details.seekTime !== "number") {
          return;
        }

        actionRef.current.onSeekTo(details.seekTime);
      },
    });
  }, [
    input.canControlPlayback,
    hasNextQueueItem,
    hasPreviousQueueItem,
  ]);
}

function buildArtwork(
  session: LiveRoomSession | null,
  currentQueueItem: LiveQueueItem | null,
): MediaSessionArtworkInput[] {
  const youtubeThumbnail =
    currentQueueItem?.sourceType === "youtube"
      ? (currentQueueItem.thumbnailUrl ??
        getYouTubeThumbnailUrl(currentQueueItem.sourceUrl))
      : session?.sourceType === "youtube" && session.sourceUrl
        ? getYouTubeThumbnailUrl(session.sourceUrl)
        : null;

  if (!youtubeThumbnail) {
    return appArtwork;
  }

  return [
    {
      sizes: "512x512",
      src: youtubeThumbnail,
      type: "image/jpeg",
    },
  ];
}

function sourceTypeLabel(sourceType: LiveRoomSession["sourceType"] | undefined) {
  if (sourceType === "youtube") {
    return "YouTube";
  }

  if (sourceType === "hls") {
    return "HLS stream";
  }

  if (sourceType === "direct") {
    return "Direct media";
  }

  return "Mistake Watch";
}

function toMediaSessionPlaybackState(
  status: LiveRoomSession["status"] | undefined,
): MediaSessionPlaybackState {
  if (status === "playing") {
    return "playing";
  }

  if (status === "paused" || status === "buffering") {
    return "paused";
  }

  return "none";
}
