import { Range, SenderError, t } from "spacetimedb/server";
import { spacetimedb } from "./module-schema";
import {
  getCurrentParticipantSession,
  isCurrentParticipantSession,
  senderIdentityHex,
} from "./room-admission";
import { nowMs, participantSessionKey } from "./room-keys";
import { listenerReceiptOutbox } from "./listener-tables";
import {
  coverageRatio,
  mergeCoverage,
  qualifyingInterval,
  LISTENER_RECEIPT_TTL_MS,
  LISTENER_ROOM_OUTBOX_LIMIT,
  LISTENER_ROOM_STATE_LIMIT,
  LISTENER_STATE_TTL_MS,
  type CoverageInterval,
} from "./listener-policy";

type Context = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];
function trusted(ctx: Context) {
  return !!ctx.db.trusted_seed_issuer.identity_hex.find(senderIdentityHex(ctx));
}
function pruneRoom(ctx: Context, roomId: string, at: bigint) {
  for (const row of ctx.db.listener_grant.by_room_id.filter(roomId)) {
    if (row.expires_ms < at) {
      ctx.db.listener_grant.delete(row);
      const cursor = ctx.db.listener_cursor.session_key.find(row.session_key);
      if (cursor) ctx.db.listener_cursor.delete(cursor);
    }
  }
  for (const row of ctx.db.listener_coverage.by_room_id.filter(roomId)) {
    if (at - row.updated_ms > BigInt(LISTENER_STATE_TTL_MS))
      ctx.db.listener_coverage.delete(row);
  }
  for (const row of ctx.db.listener_receipt_outbox.by_room_id.filter(roomId)) {
    if (at - row.created_ms > BigInt(LISTENER_RECEIPT_TTL_MS))
      ctx.db.listener_receipt_outbox.delete(row);
  }
}

export const grant_listener_learning = spacetimedb.reducer(
  {
    room_id: t.string(),
    member_id: t.string(),
    admission_id: t.string(),
    identity_hex: t.string(),
    account_id: t.string(),
    consent_epoch: t.string(),
    history_generation: t.u64(),
    valid_from_ms: t.i64(),
    expires_ms: t.i64(),
  },
  (ctx, args) => {
    if (!trusted(ctx)) return;
    const at = nowMs();
    const sessionKey = participantSessionKey(
      args.room_id,
      args.member_id,
      args.identity_hex,
    );
    const session =
      ctx.db.room_participant_session.session_key.find(sessionKey);
    if (
      !session ||
      session.admission_id !== args.admission_id ||
      !session.connection_id ||
      session.status !== "online" ||
      args.expires_ms <= at ||
      args.expires_ms > at + BigInt(120000) ||
      args.valid_from_ms > at ||
      !args.account_id ||
      !args.consent_epoch ||
      ctx.db.room_member_revocation.revocation_key.find(
        `${args.room_id}:${args.member_id}`,
      )
    )
      return;
    pruneRoom(ctx, args.room_id, at);
    const existing = ctx.db.listener_grant.session_key.find(sessionKey);
    if (
      !existing &&
      [...ctx.db.listener_grant.by_room_id.filter(args.room_id)].length >= 128
    )
      return;
    const reset =
      !existing ||
      existing.account_id !== args.account_id ||
      existing.consent_epoch !== args.consent_epoch ||
      existing.history_generation !== args.history_generation ||
      existing.admission_id !== args.admission_id ||
      !existing.connection_id.isEqual(session.connection_id);
    if (existing) ctx.db.listener_grant.delete(existing);
    ctx.db.listener_grant.insert({
      session_key: sessionKey,
      room_id: args.room_id,
      member_id: args.member_id,
      admission_id: args.admission_id,
      connection_id: session.connection_id,
      account_id: args.account_id,
      consent_epoch: args.consent_epoch,
      history_generation: args.history_generation,
      valid_from_ms:
        args.valid_from_ms > at
          ? args.valid_from_ms
          : reset
            ? at
            : existing!.valid_from_ms,
      expires_ms: args.expires_ms,
    });
    if (reset) {
      const cursor = ctx.db.listener_cursor.session_key.find(sessionKey);
      if (cursor) ctx.db.listener_cursor.delete(cursor);
    }
  },
);

export const observe_listener_playback = spacetimedb.reducer(
  {
    room_id: t.string(),
    member_id: t.string(),
    occurrence_id: t.string(),
    sequence: t.u64(),
    position_seconds: t.f64(),
    playing: t.bool(),
    buffering: t.bool(),
    muted: t.bool(),
    volume: t.f64(),
  },
  (ctx, args) => {
    const at = nowMs();
    if (!isCurrentParticipantSession(ctx, args.room_id, args.member_id)) return;
    const participant = getCurrentParticipantSession(
      ctx,
      args.room_id,
      args.member_id,
    );
    if (
      !participant ||
      participant.status !== "online" ||
      at - participant.last_seen_ms > BigInt(30000)
    )
      return;
    const grant = ctx.db.listener_grant.session_key.find(
      participant.session_key,
    );
    if (
      !grant ||
      grant.expires_ms < at ||
      grant.admission_id !== participant.admission_id ||
      !ctx.connectionId ||
      !grant.connection_id.isEqual(ctx.connectionId) ||
      ctx.db.room_member_revocation.revocation_key.find(
        `${args.room_id}:${args.member_id}`,
      )
    )
      return;
    const session = ctx.db.room_session.room_id.find(args.room_id);
    const occurrence = ctx.db.recommendation_playback_occurrence.room_id.find(
      args.room_id,
    );
    const item = session?.active_queue_item_id
      ? ctx.db.live_queue_item.queue_item_id.find(session.active_queue_item_id)
      : null;
    if (
      !session ||
      !occurrence ||
      !item ||
      item.is_unavailable ||
      item.room_id !== args.room_id ||
      session.playback_occurrence_id !== args.occurrence_id ||
      occurrence.playback_occurrence_id !== args.occurrence_id ||
      occurrence.queue_item_id !== item.queue_item_id ||
      !Number.isFinite(args.position_seconds)
    )
      return;
    // YouTube API-derived measurement permission is unresolved. No relabeling loophole.
    if (
      !["direct", "hls"].includes(item.source_type) ||
      item.source_url.length > 2048
    )
      return;
    const duration = item.duration_seconds;
    if (!duration || duration > 21600 || !Number.isInteger(duration)) return;
    const partition = `${grant.account_id}:${args.occurrence_id}:${grant.consent_epoch}:${grant.history_generation}`;
    const oldCursor = ctx.db.listener_cursor.session_key.find(
      participant.session_key,
    );
    if (oldCursor && args.sequence <= oldCursor.sequence) return;
    const audible =
      args.playing &&
      !args.buffering &&
      !args.muted &&
      Number.isFinite(args.volume) &&
      args.volume > 0 &&
      args.volume <= 1;
    // Rate-limit input before any coverage scans/writes; ordinary reporters use 5 seconds.
    // Never discard a state transition: otherwise a brief mute could be bridged.
    if (
      oldCursor?.partition_key === partition &&
      oldCursor.audible === audible &&
      at - oldCursor.at_ms < BigInt(250)
    )
      return;
    const sample = {
      atMs: Number(at),
      position: args.position_seconds,
      sequence: Number(args.sequence),
      anchorMs: Number(session.server_updated_ms),
      audible,
    };
    const previous =
      oldCursor?.partition_key === partition
        ? {
            atMs: Number(oldCursor.at_ms),
            position: oldCursor.position,
            sequence: Number(oldCursor.sequence),
            anchorMs: Number(oldCursor.anchor_ms),
            audible: oldCursor.audible,
          }
        : null;
    if (oldCursor) ctx.db.listener_cursor.delete(oldCursor);
    ctx.db.listener_cursor.insert({
      session_key: participant.session_key,
      room_id: args.room_id,
      partition_key: partition,
      at_ms: at,
      anchor_ms: session.server_updated_ms,
      position: args.position_seconds,
      sequence: args.sequence,
      audible,
    });
    const elapsed = Math.max(0, Number(at - session.server_updated_ms)) / 1000;
    const interval = qualifyingInterval(previous, sample, {
      duration,
      rate: session.playback_rate,
      canonicalPosition:
        session.position_seconds +
        (session.status === "playing" ? elapsed * session.playback_rate : 0),
      playing: session.status === "playing",
      validFromMs: Number(grant.valid_from_ms),
    });
    if (!interval) return;
    const existing = ctx.db.listener_coverage.partition_key.find(partition);
    if (existing?.emitted) return;
    if (!existing) {
      pruneRoom(ctx, args.room_id, at);
      if (
        [...ctx.db.listener_coverage.by_room_id.filter(args.room_id)].length >=
        LISTENER_ROOM_STATE_LIMIT
      )
        return;
    }
    const intervals = mergeCoverage(
      existing
        ? (JSON.parse(existing.intervals_json) as CoverageInterval[])
        : [],
      interval,
    );
    const first = existing?.first_observed_ms ?? oldCursor!.at_ms;
    const qualified = coverageRatio(intervals, duration) >= 9000;
    const canEmit =
      qualified &&
      [...ctx.db.listener_receipt_outbox.by_room_id.filter(args.room_id)]
        .length < LISTENER_ROOM_OUTBOX_LIMIT;
    if (existing) ctx.db.listener_coverage.delete(existing);
    ctx.db.listener_coverage.insert({
      partition_key: partition,
      room_id: args.room_id,
      account_id: grant.account_id,
      occurrence_id: args.occurrence_id,
      consent_epoch: grant.consent_epoch,
      history_generation: grant.history_generation,
      intervals_json: JSON.stringify(intervals),
      first_observed_ms: first,
      updated_ms: at,
      emitted: canEmit,
    });
    if (canEmit && !ctx.db.listener_receipt_outbox.receipt_id.find(partition)) {
      ctx.db.listener_receipt_outbox.insert({
        receipt_id: partition,
        room_id: args.room_id,
        member_id: args.member_id,
        account_id: grant.account_id,
        occurrence_id: args.occurrence_id,
        consent_epoch: grant.consent_epoch,
        history_generation: grant.history_generation,
        source_type: item.source_type,
        source_reference: item.source_url,
        duration_seconds: duration,
        coverage_json: JSON.stringify(intervals),
        first_observed_ms: first,
        last_observed_ms: at,
        created_ms: at,
        methodology_version: 1,
      });
    }
  },
);

export const read_listener_receipts = spacetimedb.procedure(
  { limit: t.u32() },
  t.array(listenerReceiptOutbox.rowType),
  (ctx, { limit }) =>
    ctx.withTx((tx) => {
      if (!trusted(tx as unknown as Context))
        throw new SenderError("Trusted listener receipt access required.");
      const at = nowMs();
      const olderThan = (value: bigint) =>
        new Range<bigint>(null, { tag: "excluded", value });
      let removed = 0;
      for (const grant of tx.db.listener_grant.by_expiry.filter(
        olderThan(at),
      )) {
        tx.db.listener_grant.delete(grant);
        const cursor = tx.db.listener_cursor.session_key.find(
          grant.session_key,
        );
        if (cursor) tx.db.listener_cursor.delete(cursor);
        if (++removed >= 100) break;
      }
      removed = 0;
      for (const coverage of tx.db.listener_coverage.by_updated.filter(
        olderThan(at - BigInt(LISTENER_STATE_TTL_MS)),
      )) {
        tx.db.listener_coverage.delete(coverage);
        if (++removed >= 100) break;
      }
      removed = 0;
      for (const receipt of tx.db.listener_receipt_outbox.by_created.filter(
        olderThan(at - BigInt(LISTENER_RECEIPT_TTL_MS)),
      )) {
        tx.db.listener_receipt_outbox.delete(receipt);
        if (++removed >= 100) break;
      }
      const rows: (typeof listenerReceiptOutbox.rowType.type)[] = [];
      for (const receipt of tx.db.listener_receipt_outbox.by_created.filter(
        new Range<bigint>(),
      )) {
        rows.push(receipt);
        if (rows.length >= Math.max(1, Math.min(100, limit))) break;
      }
      return rows;
    }),
);
export const acknowledge_listener_receipts = spacetimedb.reducer(
  { receipt_ids: t.array(t.string()) },
  (ctx, { receipt_ids }) => {
    if (!trusted(ctx)) return;
    for (const id of receipt_ids.slice(0, 100)) {
      const row = ctx.db.listener_receipt_outbox.receipt_id.find(id);
      if (row) ctx.db.listener_receipt_outbox.delete(row);
    }
  },
);
