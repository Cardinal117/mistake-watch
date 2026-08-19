import { t } from "spacetimedb/server";
import { normalizeAvatarKey } from "./normalization";
import { isTrustedRecommendationAuthority } from "./recommendation-authority";
import {
  getCurrentParticipantSession,
  getValidRoomAdmissionGrant,
  isCurrentParticipantSession,
  removeParticipantSession,
  senderIdentityHex,
} from "./room-admission";
import { recordRoomError } from "./room-errors";
import {
  syncAggregateParticipant,
  upsertAggregateParticipant,
  upsertPermission,
} from "./room-participant-state";
import { kickKey, nowMs, participantKey } from "./room-keys";
import { spacetimedb } from "./module-schema";

const KICK_REJOIN_BLOCK_MS = 8_000;
const ADMISSION_GRANT_MEMBER_LIMIT = 8;

export const issue_room_admission_grant = spacetimedb.reducer(
  {
    admission_id: t.string(),
    admission_token: t.string(),
    authorization_kind: t.string(),
    expires_ms: t.i64(),
    identity_hex: t.string(),
    member_id: t.string(),
    role: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      admission_id,
      admission_token,
      authorization_kind,
      expires_ms,
      identity_hex,
      member_id,
      role,
      room_id,
    },
  ) => {
    if (!isTrustedRecommendationAuthority(ctx)) {
      recordRoomError(ctx, {
        code: "admission_issuer_denied",
        message: "Admission grant requires a trusted server issuer.",
        roomId: room_id,
      });
      return;
    }

    const token = admission_token.trim();
    const identityHex = identity_hex.trim().toLowerCase();
    const now = nowMs();
    const maxExpiryMs = now + BigInt(5 * 60 * 1000);
    const validKind =
      authorization_kind === "account" || authorization_kind === "guest";
    const validRole = role === "host" || role === "guest";

    if (
      !room_id.trim() ||
      !member_id.trim() ||
      !admission_id.trim() ||
      admission_id.length > 128 ||
      token.length < 32 ||
      token.length > 256 ||
      !/^[0-9a-f]{64}$/.test(identityHex) ||
      !validKind ||
      !validRole
    ) {
      recordRoomError(ctx, {
        code: "admission_grant_invalid",
        message: "Admission grant fields are invalid.",
        roomId: room_id,
      });
      return;
    }

    if (expires_ms <= now || expires_ms > maxExpiryMs) {
      recordRoomError(ctx, {
        code: "admission_grant_expiry_invalid",
        message: "Admission grant expiry is invalid.",
        roomId: room_id,
      });
      return;
    }

    let activeMemberGrants = 0;

    for (const grant of [...ctx.db.room_admission_grant.iter()]) {
      if (grant.expires_ms < now) {
        ctx.db.room_admission_grant.delete(grant);
      } else if (grant.room_id === room_id && grant.member_id === member_id) {
        activeMemberGrants += 1;
      }
    }

    if (activeMemberGrants >= ADMISSION_GRANT_MEMBER_LIMIT) {
      recordRoomError(ctx, {
        code: "admission_grant_limit",
        message: "Admission grant limit reached for this room member.",
        roomId: room_id,
      });
      return;
    }

    const existing = ctx.db.room_admission_grant.admission_token.find(token);

    if (existing) {
      ctx.db.room_admission_grant.delete(existing);
    }

    ctx.db.room_admission_grant.insert({
      admission_id: admission_id.trim(),
      admission_token: token,
      authorization_kind,
      created_by_identity: ctx.sender,
      created_ms: now,
      expires_ms,
      identity_hex: identityHex,
      member_id: member_id.trim(),
      role,
      room_id: room_id.trim(),
    });
  },
);

export const join_room = spacetimedb.reducer(
  {
    admission_id: t.string(),
    admission_token: t.string(),
    avatar_key: t.option(t.string()),
    display_name: t.string(),
    member_id: t.string(),
    role: t.string(),
    room_id: t.string(),
  },
  (
    ctx,
    {
      admission_id,
      admission_token,
      avatar_key,
      display_name,
      member_id,
      role,
      room_id,
    },
  ) => {
    const session = ctx.db.room_session.room_id.find(room_id);
    const kicked = ctx.db.room_kick.kick_key.find(kickKey(room_id, member_id));
    const resolvedRole =
      session?.host_member_id === member_id && role === "host"
        ? "host"
        : "guest";

    if (
      kicked &&
      resolvedRole !== "host" &&
      nowMs() - kicked.created_ms < KICK_REJOIN_BLOCK_MS
    ) {
      recordRoomError(ctx, {
        code: "member_removed",
        message: "Join ignored because this guest was removed by the host.",
        roomId: room_id,
        severity: "info",
      });
      return;
    }

    const currentSession = getCurrentParticipantSession(
      ctx,
      room_id,
      member_id,
    );
    const isIdempotentAdmission =
      currentSession?.admission_id === admission_id &&
      currentSession.identity.isEqual(ctx.sender) &&
      isCurrentParticipantSession(ctx, room_id, member_id);
    const admissionGrant = isIdempotentAdmission
      ? null
      : getValidRoomAdmissionGrant(ctx, {
          admissionId: admission_id,
          admissionToken: admission_token,
          memberId: member_id,
          role,
          roomId: room_id,
        });

    if (!isIdempotentAdmission && !admissionGrant) {
      recordRoomError(ctx, {
        code: "admission_denied",
        message: "Join ignored because trusted live admission is required.",
        roomId: room_id,
      });
      return;
    }

    if (kicked) {
      ctx.db.room_kick.delete(kicked);
    }

    if (currentSession) {
      removeParticipantSession(ctx, currentSession);
    }

    if (admissionGrant) {
      ctx.db.room_admission_grant.delete(admissionGrant);
    }

    ctx.db.room_participant_session.insert({
      admission_id,
      avatar_key: normalizeAvatarKey(avatar_key),
      connection_id: ctx.connectionId ?? undefined,
      display_name,
      identity: ctx.sender,
      last_seen_ms: nowMs(),
      member_id,
      role: resolvedRole,
      room_id,
      session_key: `${room_id}:${member_id}:${senderIdentityHex(ctx)}`,
      status: "online",
    });
    ctx.db.room_participant_presence.insert({
      admission_id,
      last_seen_ms: nowMs(),
      member_id,
      room_id,
      status: "online",
    });

    upsertAggregateParticipant(ctx, {
      avatarKey: normalizeAvatarKey(avatar_key),
      displayName: display_name,
      identity: ctx.sender,
      memberId: member_id,
      role: resolvedRole,
      roomId: room_id,
      status: "online",
    });

    if (
      !ctx.db.room_permission.permission_key.find(
        participantKey(room_id, member_id),
      )
    ) {
      const isHost = resolvedRole === "host";
      upsertPermission(ctx, {
        canAddQueue: true,
        canControlBrowser: isHost,
        canControlPlayback: isHost,
        canManageQueue: isHost,
        memberId: member_id,
        roomId: room_id,
        updatedByMemberId: member_id,
      });
    }
  },
);

export const leave_room = spacetimedb.reducer(
  {
    member_id: t.string(),
    room_id: t.string(),
  },
  (ctx, { member_id, room_id }) => {
    const participantSession = getCurrentParticipantSession(
      ctx,
      room_id,
      member_id,
    );

    if (
      !participantSession ||
      !isCurrentParticipantSession(ctx, room_id, member_id)
    ) {
      return;
    }

    removeParticipantSession(ctx, participantSession);
    syncAggregateParticipant(ctx, room_id, member_id, true);
  },
);

export const on_disconnect = spacetimedb.clientDisconnected((ctx) => {
  if (!ctx.connectionId) {
    return;
  }

  for (const participantSession of [
    ...ctx.db.room_participant_session.iter(),
  ]) {
    if (participantSession.connection_id?.isEqual(ctx.connectionId)) {
      const presence = ctx.db.room_participant_presence.admission_id.find(
        participantSession.admission_id,
      );

      ctx.db.room_participant_session.delete(participantSession);
      ctx.db.room_participant_session.insert({
        ...participantSession,
        connection_id: undefined,
        last_seen_ms: nowMs(),
        status: "idle",
      });

      if (presence) {
        ctx.db.room_participant_presence.delete(presence);
        ctx.db.room_participant_presence.insert({
          ...presence,
          last_seen_ms: nowMs(),
          status: "idle",
        });
      }

      syncAggregateParticipant(
        ctx,
        participantSession.room_id,
        participantSession.member_id,
      );
    }
  }
});
