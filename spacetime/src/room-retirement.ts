import { t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
import { isTrustedRecommendationAuthority } from "./recommendation-authority";

// Only the durable lifecycle worker may retire a room. No room IDs come from
// a user-callable mutation. The marker contains no media/member data and prevents
// already-issued grants from resurrecting a purged room.
export const retire_room = spacetimedb.reducer(
  { room_id: t.string(), purge: t.bool() },
  (ctx, { room_id, purge }) => {
    if (!isTrustedRecommendationAuthority(ctx))
      throw new Error("Trusted authority required");
    if (
      purge &&
      [...ctx.db.recommendation_event_outbox.iter()].some(
        (event) =>
          event.room_id === room_id &&
          (event.event_type === "media_liked" ||
            event.event_type === "media_unliked"),
      )
    ) {
      throw new Error("Pending preferences must be persisted before cleanup");
    }
    if (!ctx.db.retired_room.room_id.find(room_id))
      ctx.db.retired_room.insert({ room_id });
    const tables = [
      ctx.db.room_participant_session,
      ctx.db.room_participant_presence,
      ctx.db.room_participant,
      ctx.db.room_permission,
      ctx.db.room_seed_grant,
      ctx.db.room_admission_grant,
      ...(purge
        ? [
            ctx.db.room_session,
            ctx.db.live_queue_item,
            ctx.db.room_chat_message,
            ctx.db.room_error,
            ctx.db.room_kick,
            ctx.db.room_member_revocation,
            ctx.db.room_rhythm_profile,
            ctx.db.guest_media_preference,
            ctx.db.recommendation_event_outbox,
            ctx.db.recommendation_event_overflow,
            ctx.db.recommendation_playback_memory,
            ctx.db.recommendation_playback_occurrence,
            ctx.db.recommendation_processed_action,
            ctx.db.recommendation_room_session,
          ]
        : []),
    ];
    for (const table of tables) {
      // The concrete tables have differing row types; every selected table has
      // room_id. Keep their actual rows for delete, never synthesize keys.
      const scoped = table as unknown as {
        iter(): Iterable<{ room_id: string }>;
        delete(row: { room_id: string }): unknown;
      };
      for (const row of [...scoped.iter()])
        if (row.room_id === room_id) scoped.delete(row);
    }
    if (!purge) {
      const session = ctx.db.room_session.room_id.find(room_id);
      if (session)
        ctx.db.room_session.room_id.update({
          ...session,
          status: "paused",
          controller_identity: undefined,
        });
    }
  },
);
