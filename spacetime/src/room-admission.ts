import { spacetimedb } from "./module-schema";
import {
  constantTimeStringEqual,
  nowMs,
  participantSessionKey,
} from "./room-keys";

type ReducerContext = Parameters<Parameters<typeof spacetimedb.reducer>[1]>[0];

export type AdmissionClaim = {
  admissionId: string;
  admissionToken: string;
  memberId: string;
  role: string;
  roomId: string;
};

export function senderIdentityHex(ctx: { sender: unknown }) {
  const sender = ctx.sender as { toHexString?: () => string };
  return sender.toHexString?.() ?? String(ctx.sender);
}

export function getCurrentParticipantSession(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
) {
  return ctx.db.room_participant_session.session_key.find(
    participantSessionKey(roomId, memberId, senderIdentityHex(ctx)),
  );
}

export function isCurrentParticipantSession(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
) {
  const session = getCurrentParticipantSession(ctx, roomId, memberId);

  if (!session || !session.identity.isEqual(ctx.sender)) {
    return false;
  }

  if (!session.connection_id || !ctx.connectionId) {
    return false;
  }

  return session.connection_id.isEqual(ctx.connectionId);
}

export function getValidRoomAdmissionGrant(
  ctx: ReducerContext,
  claim: AdmissionClaim,
) {
  const grant = ctx.db.room_admission_grant.admission_token.find(
    claim.admissionToken.trim(),
  );

  if (!grant) {
    return null;
  }

  if (grant.expires_ms < nowMs()) {
    ctx.db.room_admission_grant.delete(grant);
    return null;
  }

  if (
    grant.admission_id !== claim.admissionId ||
    grant.room_id !== claim.roomId ||
    grant.member_id !== claim.memberId ||
    grant.role !== claim.role ||
    grant.identity_hex !== senderIdentityHex(ctx) ||
    !constantTimeStringEqual(
      grant.admission_token,
      claim.admissionToken.trim(),
    )
  ) {
    return null;
  }

  return grant;
}

export function removeParticipantSession(
  ctx: ReducerContext,
  session: NonNullable<ReturnType<typeof getCurrentParticipantSession>>,
) {
  const presence = ctx.db.room_participant_presence.admission_id.find(
    session.admission_id,
  );

  if (presence) {
    ctx.db.room_participant_presence.delete(presence);
  }

  ctx.db.room_participant_session.delete(session);
}

export function removeMemberSessions(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
) {
  for (const session of [...ctx.db.room_participant_session.iter()]) {
    if (session.room_id === roomId && session.member_id === memberId) {
      removeParticipantSession(ctx, session);
    }
  }
}

export function onlineMemberSessions(
  ctx: ReducerContext,
  roomId: string,
  memberId: string,
) {
  return [...ctx.db.room_participant_session.iter()]
    .filter(
      (session) =>
        session.room_id === roomId &&
        session.member_id === memberId &&
        session.status === "online",
    )
    .sort((a, b) => (a.last_seen_ms > b.last_seen_ms ? -1 : 1));
}
