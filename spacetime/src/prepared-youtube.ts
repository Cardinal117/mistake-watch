import { t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
import {
  classifyPlaybackAdvance,
  completionRatioBps,
} from "./recommendation-events";
type Context = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];
type Session = NonNullable<
  ReturnType<Context["db"]["room_session"]["room_id"]["find"]>
>;
type QueueItem = NonNullable<
  ReturnType<Context["db"]["live_queue_item"]["queue_item_id"]["find"]>
>;
type Helpers = {
  getAuthorizedPlaybackActor(
    ctx: Context,
    roomId: string,
    memberId: string,
  ): { session: Session } | null;
  nextPlaybackQueueItem(
    ctx: Context,
    roomId: string,
    mode: string,
  ): QueueItem | undefined | null;
  commitQueueAdvance(
    ctx: Context,
    session: Session,
    item: QueueItem,
    url: string,
    status: "paused" | "playing",
    transition: {
      actorMemberId: string;
      outcome: "completed" | "failed" | "skipped";
      reason: string;
    },
  ): void;
  applyPlaybackUpdate(
    ctx: Context,
    actor: string,
    position: number,
    room: string,
    status: string,
  ): void;
};
/** Additive reducers: existing clients and their advance arguments are unchanged. */
export function registerPreparedYouTubeReducers(helpers: Helpers) {
  const prepare = spacetimedb.reducer(
    {
      actor_member_id: t.string(),
      room_id: t.string(),
      expected_source_url: t.string(),
      expected_active_queue_item_id: t.option(t.string()),
      expected_playback_occurrence_id: t.option(t.string()),
      expected_next_queue_item_id: t.string(),
      expected_server_updated_ms: t.f64(),
    },
    (ctx, args) => {
      const authority = helpers.getAuthorizedPlaybackActor(
        ctx,
        args.room_id,
        args.actor_member_id,
      );
      if (!authority) return;
      const session = authority.session;
      if (
        !session.queue_autoplay_enabled ||
        Number(session.server_updated_ms) !== args.expected_server_updated_ms ||
        session.source_url !== args.expected_source_url ||
        session.active_queue_item_id !== args.expected_active_queue_item_id ||
        session.playback_occurrence_id !== args.expected_playback_occurrence_id
      )
        return;
      const next = helpers.nextPlaybackQueueItem(
        ctx,
        args.room_id,
        session.queue_mode,
      );
      if (
        !next ||
        next.queue_item_id !== args.expected_next_queue_item_id ||
        next.source_type !== "youtube" ||
        next.is_unavailable ||
        next.queue_item_id === session.active_queue_item_id
      )
        return;
      helpers.commitQueueAdvance(
        ctx,
        session,
        next,
        next.source_url,
        "paused",
        {
          actorMemberId: args.actor_member_id,
          ...classifyPlaybackAdvance({
            autoplay: true,
            completionRatioBps: completionRatioBps(
              session.position_seconds,
              session.source_duration_seconds,
            ),
            playbackStatus: session.status,
          }),
        },
      );
    },
  );
  const start = spacetimedb.reducer(
    {
      actor_member_id: t.string(),
      room_id: t.string(),
      position_seconds: t.f64(),
      expected_source_url: t.string(),
      expected_active_queue_item_id: t.string(),
      expected_playback_occurrence_id: t.option(t.string()),
      expected_server_updated_ms: t.f64(),
    },
    (ctx, args) => {
      const authority = helpers.getAuthorizedPlaybackActor(
        ctx,
        args.room_id,
        args.actor_member_id,
      );
      if (!authority) return;
      const s = authority.session;
      if (
        !s.queue_autoplay_enabled ||
        s.source_type !== "youtube" ||
        s.source_url !== args.expected_source_url ||
        s.active_queue_item_id !== args.expected_active_queue_item_id ||
        s.playback_occurrence_id !== args.expected_playback_occurrence_id ||
        Number(s.server_updated_ms) !== args.expected_server_updated_ms ||
        s.status !== "paused" ||
        s.position_seconds !== 0 ||
        !Number.isFinite(args.position_seconds) ||
        args.position_seconds < 0 ||
        args.position_seconds > 2
      )
        return;
      helpers.applyPlaybackUpdate(
        ctx,
        args.actor_member_id,
        args.position_seconds,
        args.room_id,
        "playing",
      );
    },
  );
  return { prepare, start };
}
