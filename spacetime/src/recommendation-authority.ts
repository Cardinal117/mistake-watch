import { SenderError, t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
import {
  asRecommendationContext,
  claimRecommendationAction,
  guestMediaPreference,
  recommendationEventOutbox,
  recommendationMediaIdentity,
  selectRecommendationOutboxBatch,
  setGuestMediaPreference,
} from "./recommendation-events";

export const init = spacetimedb.init((ctx) => {
  const identityHex = senderIdentityHex(ctx);

  if (!ctx.db.trusted_seed_issuer.identity_hex.find(identityHex)) {
    ctx.db.trusted_seed_issuer.insert({
      created_ms: BigInt(Date.now()),
      identity_hex: identityHex,
      label: "module-owner",
    });
  }
});

export const read_recommendation_event_outbox = spacetimedb.procedure(
  { limit: t.u32() },
  t.array(recommendationEventOutbox.rowType),
  (ctx, { limit }) => {
    const senderHex = senderIdentityHex(ctx);

    return ctx.withTx((tx) => {
      if (!tx.db.trusted_seed_issuer.identity_hex.find(senderHex)) {
        throw new SenderError("Trusted recommendation outbox access required.");
      }

      return selectRecommendationOutboxBatch(
        tx.db.recommendation_event_outbox.iter(),
        limit,
      );
    });
  },
);

export const acknowledge_recommendation_event_outbox = spacetimedb.reducer(
  { event_ids: t.array(t.string()) },
  (ctx, { event_ids }) => {
    if (!isTrustedRecommendationAuthority(ctx)) {
      return;
    }

    const acknowledged = new Set(event_ids.slice(0, 100));

    for (const event of [...ctx.db.recommendation_event_outbox.iter()]) {
      if (acknowledged.has(event.event_id)) {
        ctx.db.recommendation_event_outbox.delete(event);
      }
    }
  },
);

export const set_guest_media_preference = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string(),
    expected_revision: t.u32(),
    liked: t.bool(),
    queue_item_id: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      client_action_id,
      expected_revision,
      liked,
      queue_item_id,
      room_id,
    },
  ) => {
    const actor = ctx.db.room_participant.participant_key.find(
      `${room_id}:${actor_member_id}`,
    );
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queue_item_id);

    if (
      !actor ||
      !actor.identity.isEqual(ctx.sender) ||
      !queueItem ||
      queueItem.room_id !== room_id
    ) {
      return;
    }

    const media = recommendationMediaIdentity({
      queueItemId: queueItem.queue_item_id,
      sourceType: queueItem.source_type,
      sourceUrl: queueItem.source_url,
    });

    if (
      media &&
      claimRecommendationAction(
        asRecommendationContext(ctx),
        {
          actionId: client_action_id,
          actionType: "guest_preference",
          actorMemberId: actor_member_id,
          roomId: room_id,
        },
        BigInt(Date.now()),
      )
    ) {
      setGuestMediaPreference(
        asRecommendationContext(ctx),
        {
          actorMemberId: actor_member_id,
          expectedRevision: expected_revision,
          liked,
          mediaId: media.mediaId,
          queueItemId: queueItem.queue_item_id,
          roomId: room_id,
          sourceType: media.sourceType,
        },
        BigInt(Date.now()),
      );
    }
  },
);

export const read_my_guest_media_preferences = spacetimedb.procedure(
  { actor_member_id: t.string(), room_id: t.string() },
  t.array(guestMediaPreference.rowType),
  (ctx, { actor_member_id, room_id }) =>
    ctx.withTx((tx) => {
      const actor = tx.db.room_participant.participant_key.find(
        `${room_id}:${actor_member_id}`,
      );

      if (!actor || !actor.identity.isEqual(ctx.sender)) {
        throw new SenderError("Room-scoped preference access required.");
      }

      return [...tx.db.guest_media_preference.iter()].filter(
        (preference) =>
          preference.room_id === room_id &&
          preference.actor_member_id === actor_member_id,
      );
    }),
);

export function isTrustedRecommendationAuthority(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
) {
  return Boolean(
    ctx.db.trusted_seed_issuer.identity_hex.find(senderIdentityHex(ctx)),
  );
}

function senderIdentityHex(ctx: { sender: unknown }) {
  const sender = ctx.sender as { toHexString?: () => string };
  return sender.toHexString?.() ?? String(ctx.sender);
}
