import { SenderError, t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
import {
  isCurrentParticipantSession,
  senderIdentityHex,
} from "./room-admission";
import { participantSessionKey } from "./room-keys";
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
      !isCurrentParticipantSession(ctx, room_id, actor_member_id) ||
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

export const set_verified_room_media_preference = spacetimedb.reducer(
  {
    actor_member_id: t.string(),
    client_action_id: t.string(),
    expected_revision: t.u32(),
    liked: t.bool(),
    media_id: t.string(),
    record_neutral_without_current: t.bool(),
    room_id: t.string(),
    source_type: t.string(),
  },
  (
    ctx,
    {
      actor_member_id,
      client_action_id,
      expected_revision,
      liked,
      media_id,
      record_neutral_without_current,
      room_id,
      source_type,
    },
  ) => {
    if (!isTrustedRecommendationAuthority(ctx)) {
      return;
    }

    const actor = ctx.db.room_participant.participant_key.find(
      `${room_id}:${actor_member_id}`,
    );
    const media = verifiedPreferenceMedia(ctx, {
      mediaId: media_id,
      roomId: room_id,
      sourceType: source_type,
    });

    if (
      !actor ||
      actor.room_id !== room_id ||
      !media ||
      !claimRecommendationAction(
        asRecommendationContext(ctx),
        {
          actionId: client_action_id,
          actionType: "verified_room_preference",
          actorMemberId: actor_member_id,
          roomId: room_id,
        },
        BigInt(Date.now()),
      )
    ) {
      return;
    }

    setGuestMediaPreference(
      asRecommendationContext(ctx),
      {
        actorMemberId: actor_member_id,
        expectedRevision: expected_revision,
        liked,
        mediaId: media.mediaId,
        queueItemId: media.queueItemId,
        recordNeutralWithoutCurrent: record_neutral_without_current,
        roomId: room_id,
        sourceType: media.sourceType,
      },
      BigInt(Date.now()),
    );
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
      const actorSession = tx.db.room_participant_session.session_key.find(
        participantSessionKey(
          room_id,
          actor_member_id,
          senderIdentityHex(ctx),
        ),
      );

      if (!actor || !actorSession || !actorSession.identity.isEqual(ctx.sender)) {
        throw new SenderError("Room-scoped preference access required.");
      }

      return [...tx.db.guest_media_preference.iter()].filter(
        (preference) =>
          preference.room_id === room_id &&
          preference.actor_member_id === actor_member_id,
      );
    }),
);

export const read_verified_room_media_preferences = spacetimedb.procedure(
  { actor_member_id: t.string(), room_id: t.string() },
  t.array(guestMediaPreference.rowType),
  (ctx, { actor_member_id, room_id }) =>
    ctx.withTx((tx) => {
      if (!isTrustedRecommendationAuthority(tx)) {
        throw new SenderError("Trusted preference access required.");
      }

      const actor = tx.db.room_participant.participant_key.find(
        `${room_id}:${actor_member_id}`,
      );

      if (!actor || actor.room_id !== room_id) {
        throw new SenderError("Active room preference access required.");
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

function verifiedPreferenceMedia(
  ctx: Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0],
  input: { mediaId: string; roomId: string; sourceType: string },
) {
  const sourceType = input.sourceType.trim().toLowerCase();
  const mediaId = input.mediaId.trim();

  if (sourceType === "youtube" && /^[A-Za-z0-9_-]{6,64}$/.test(mediaId)) {
    return { mediaId, sourceType };
  }

  if (sourceType === "uploaded") {
    const queueItem = [...ctx.db.live_queue_item.iter()].find(
      (item) =>
        item.room_id === input.roomId &&
        item.source_url === `mw-uploaded-asset:${mediaId}`,
    );

    return queueItem
      ? { mediaId, queueItemId: queueItem.queue_item_id, sourceType }
      : null;
  }

  if (
    (sourceType === "direct" || sourceType === "hls") &&
    mediaId.startsWith("queue:")
  ) {
    const queueItemId = mediaId.slice("queue:".length);
    const queueItem = ctx.db.live_queue_item.queue_item_id.find(queueItemId);

    if (!queueItem || queueItem.room_id !== input.roomId) {
      return null;
    }

    const identity = recommendationMediaIdentity({
      queueItemId: queueItem.queue_item_id,
      sourceType: queueItem.source_type,
      sourceUrl: queueItem.source_url,
    });

    return identity?.mediaId === mediaId && identity.sourceType === sourceType
      ? { ...identity, queueItemId }
      : null;
  }

  return null;
}
