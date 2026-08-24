import { t } from "spacetimedb/server";

import { spacetimedb } from "./module-schema";
import { getParticipant, isParticipantSender } from "./room-participant-state";
import {
  evaluateRoomRhythmClear,
  evaluateRoomRhythmPublication,
  type RoomRhythmProfileValue,
} from "./room-rhythm-policy";
import { nowMs } from "./room-keys";

type ReducerContext = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];

export const publish_room_rhythm_profile = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    algorithm_version: t.string(),
    beat_interval_seconds: t.f64(),
    bpm: t.f64(),
    confidence: t.f64(),
    media_beat_offset_seconds: t.f64(),
    media_id: t.string(),
    playback_occurrence_id: t.string(),
    revision: t.u32(),
    room_id: t.string(),
    ttl_ms: t.u32(),
  },
  (
    ctx,
    {
      actor_member_id,
      algorithm_version,
      beat_interval_seconds,
      bpm,
      confidence,
      media_beat_offset_seconds,
      media_id,
      playback_occurrence_id,
      revision,
      room_id,
      ttl_ms,
    },
  ) => {
    const session = ctx.db.room_session.room_id.find(room_id);
    const actor = getParticipant(ctx, room_id, actor_member_id);
    const current = ctx.db.room_rhythm_profile.room_id.find(room_id);
    const result = evaluateRoomRhythmPublication({
      actor: actor
        ? {
            memberId: actor.member_id,
            role: actor.role,
            senderMatches: isParticipantSender(ctx, actor),
          }
        : null,
      candidate: {
        algorithmVersion: algorithm_version,
        beatIntervalSeconds: beat_interval_seconds,
        bpm,
        confidence,
        mediaBeatOffsetSeconds: media_beat_offset_seconds,
        mediaId: media_id,
        playbackOccurrenceId: playback_occurrence_id,
        revision,
        roomId: room_id,
        ttlMs: ttl_ms,
      },
      current: current ? toPolicyProfile(current) : null,
      nowMs: Number(nowMs()),
      session: session
        ? {
            hostMemberId: session.host_member_id,
            playbackOccurrenceId: session.playback_occurrence_id,
            roomId: session.room_id,
            sourceType: session.source_type,
            sourceUrl: session.source_url,
            status: session.status,
          }
        : null,
    });

    if (!result.accepted) return;
    if (current) ctx.db.room_rhythm_profile.delete(current);
    ctx.db.room_rhythm_profile.insert({
      algorithm_version: result.row.algorithmVersion,
      beat_interval_seconds: result.row.beatIntervalSeconds,
      bpm: result.row.bpm,
      confidence: result.row.confidence,
      expires_ms: BigInt(result.row.expiresMs),
      media_beat_offset_seconds: result.row.mediaBeatOffsetSeconds,
      media_id: result.row.mediaId,
      playback_occurrence_id: result.row.playbackOccurrenceId,
      published_ms: BigInt(result.row.publishedMs),
      revision: result.row.revision,
      room_id: result.row.roomId,
      source_type: result.row.sourceType,
    });
  },
);

export const clear_room_rhythm_profile = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    expected_playback_occurrence_id: t.string(),
    expected_revision: t.u32(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      expected_playback_occurrence_id,
      expected_revision,
      room_id,
    },
  ) => {
    const session = ctx.db.room_session.room_id.find(room_id);
    const actor = getParticipant(ctx, room_id, actor_member_id);
    const current = ctx.db.room_rhythm_profile.room_id.find(room_id);
    const result = evaluateRoomRhythmClear({
      actor: actor
        ? {
            memberId: actor.member_id,
            role: actor.role,
            senderMatches: isParticipantSender(ctx, actor),
          }
        : null,
      current: current ? toPolicyProfile(current) : null,
      expectedPlaybackOccurrenceId: expected_playback_occurrence_id,
      expectedRevision: expected_revision,
      roomId: room_id,
      session: session
        ? {
            hostMemberId: session.host_member_id,
            playbackOccurrenceId: session.playback_occurrence_id,
            roomId: session.room_id,
            sourceType: session.source_type,
            sourceUrl: session.source_url,
            status: session.status,
          }
        : null,
    });

    if (result.accepted && current) {
      ctx.db.room_rhythm_profile.delete(current);
    }
  },
);

function toPolicyProfile(
  row: ReturnType<
    ReducerContext["db"]["room_rhythm_profile"]["room_id"]["find"]
  > &
    object,
): RoomRhythmProfileValue {
  return {
    algorithmVersion: row.algorithm_version,
    beatIntervalSeconds: row.beat_interval_seconds,
    bpm: row.bpm,
    confidence: row.confidence,
    expiresMs: Number(row.expires_ms),
    mediaBeatOffsetSeconds: row.media_beat_offset_seconds,
    mediaId: row.media_id,
    playbackOccurrenceId: row.playback_occurrence_id,
    publishedMs: Number(row.published_ms),
    revision: row.revision,
    roomId: row.room_id,
    sourceType: "youtube",
  };
}
