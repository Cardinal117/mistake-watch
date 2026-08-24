"use client";

import { useEffect, useMemo, useRef } from "react";

import { parseYouTubeVideoId } from "@/lib/player/source";
import type { LiveRoomState } from "@/lib/spacetime";
import type { AudioCompanionSnapshot } from "./client";
import {
  observeStableRoomRhythm,
  ROOM_RHYTHM_ALGORITHM_VERSION,
  ROOM_RHYTHM_PUBLICATION_TTL_MS,
  selectRoomRhythmPublicationContext,
  type RoomRhythmPublication,
  type StableRoomRhythmState,
} from "./room-rhythm";

export const ROOM_RHYTHM_REFRESH_MS = 6_000;

export function useRoomRhythmPublication(input: {
  companion: AudioCompanionSnapshot;
  liveRoom: LiveRoomState;
  mediaPositionSeconds: number;
}) {
  const { companion, liveRoom, mediaPositionSeconds } = input;
  const stabilityRef = useRef<StableRoomRhythmState | null>(null);
  const lastProcessedSequenceRef = useRef(-1);
  const lastPublishAttemptMsRef = useRef(0);
  const lastClearKeyRef = useRef<string | null>(null);
  const latestRef = useRef<{
    context: ReturnType<typeof selectRoomRhythmPublicationContext>;
    profileRevision: number;
    publish(publication: RoomRhythmPublication): void;
  }>({ context: null, profileRevision: 0, publish: () => {} });
  const session = liveRoom.snapshot.session;
  const profile = liveRoom.snapshot.roomRhythmProfile;
  const mediaId = useMemo(
    () => parseYouTubeVideoId(session?.sourceUrl ?? ""),
    [session?.sourceUrl],
  );
  const context = useMemo(
    () =>
      selectRoomRhythmPublicationContext({
        algorithmVersion: ROOM_RHYTHM_ALGORITHM_VERSION,
        canManageAuthority: liveRoom.canManageAuthority,
        connectionStatus: liveRoom.connectionStatus,
        currentRevision: profile?.revision ?? 0,
        mediaId,
        mediaPositionSeconds,
        playbackOccurrenceId: session?.playbackOccurrenceId ?? null,
        playbackStatus: session?.status ?? "paused",
        sourceType: session?.sourceType ?? null,
      }),
    [
      liveRoom.canManageAuthority,
      liveRoom.connectionStatus,
      mediaId,
      mediaPositionSeconds,
      profile?.revision,
      session?.playbackOccurrenceId,
      session?.sourceType,
      session?.status,
    ],
  );

  useEffect(() => {
    latestRef.current = {
      context,
      profileRevision: profile?.revision ?? 0,
      publish: liveRoom.publishRoomRhythmProfile,
    };
  }, [context, liveRoom.publishRoomRhythmProfile, profile?.revision]);

  useEffect(() => {
    const frame = companion.rhythm;
    if (!context || companion.status !== "locked" || !frame) {
      stabilityRef.current = null;
      lastProcessedSequenceRef.current = -1;
      return;
    }
    if (frame.sequence === lastProcessedSequenceRef.current) return;
    lastProcessedSequenceRef.current = frame.sequence;

    const result = observeStableRoomRhythm(stabilityRef.current, {
      context,
      frame,
    });
    stabilityRef.current = result.state;
    if (!result.publication) return;

    lastPublishAttemptMsRef.current = Date.now();
    liveRoom.publishRoomRhythmProfile(result.publication);
  }, [companion, context, liveRoom]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const latest = latestRef.current;
      const stable = stabilityRef.current;
      const now = Date.now();
      if (
        !latest.context ||
        !stable ||
        stable.consistentObservations < 2 ||
        now - lastPublishAttemptMsRef.current < ROOM_RHYTHM_REFRESH_MS
      ) {
        return;
      }

      lastPublishAttemptMsRef.current = now;
      latest.publish({
        algorithmVersion: latest.context.algorithmVersion,
        beatIntervalSeconds: stable.frame.beatIntervalSeconds!,
        bpm: stable.frame.bpm!,
        confidence: stable.frame.confidence,
        mediaBeatOffsetSeconds: stable.mediaBeatOffsetSeconds,
        mediaId: latest.context.mediaId,
        playbackOccurrenceId: latest.context.playbackOccurrenceId,
        revision: latest.profileRevision + 1,
        ttlMs: ROOM_RHYTHM_PUBLICATION_TTL_MS,
      });
    }, ROOM_RHYTHM_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const stillCurrent =
      session?.sourceType === "youtube" &&
      session.playbackOccurrenceId === profile?.playbackOccurrenceId;
    if (!profile || stillCurrent) {
      lastClearKeyRef.current = null;
      return;
    }

    if (
      !liveRoom.canManageAuthority ||
      liveRoom.connectionStatus !== "connected"
    ) {
      return;
    }

    const clearKey = `${profile.playbackOccurrenceId}:${profile.revision}`;
    if (lastClearKeyRef.current === clearKey) return;
    lastClearKeyRef.current = clearKey;

    liveRoom.clearRoomRhythmProfile({
      expectedPlaybackOccurrenceId: profile.playbackOccurrenceId,
      expectedRevision: profile.revision,
    });
  }, [liveRoom, profile, session]);
}
