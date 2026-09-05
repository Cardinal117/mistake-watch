import "server-only";

import { cookies } from "next/headers";

import { getAccountSummary } from "@/lib/account/server";
import type { AccountSummary } from "@/lib/account/types";
import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import { createSupabaseAdminClient, type Tables } from "@/lib/supabase";

import {
  canStartUploadedMedia,
  canWatchRoomMedia,
  type UploadedRoomPlaybackDecision,
} from "./room-media-session-policy";

const ROOM_MEDIA_SESSION_TTL_HOURS = 12;

export class RoomMediaSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RoomMediaSessionError";
  }
}

export type CreatedRoomMediaSession = {
  assetId: string;
  expiresAt: string;
  id: string;
  roomId: string;
  status: string;
};

export type RoomMediaPlaybackAccessResult = {
  asset: Pick<
    Tables<"media_assets">,
    "id" | "mime_type" | "processed_object_key" | "r2_object_key" | "status"
  > | null;
  decision: UploadedRoomPlaybackDecision;
  participant: {
    memberId: string;
    roomId: string;
  } | null;
  session: Pick<
    Tables<"room_media_sessions">,
    "ended_at" | "expires_at" | "id" | "media_asset_id" | "room_id" | "status"
  > | null;
};

export async function createUploadedRoomMediaSession(input: {
  assetId: string;
  roomId: string;
}): Promise<CreatedRoomMediaSession> {
  const account = await getAccountSummary();

  if (account.status !== "signed-in") {
    throw new RoomMediaSessionError(
      "Sign in with an authorized account to start uploaded media.",
      401,
    );
  }

  const admin = createSupabaseAdminClient();
  const [authorization, asset, authority] = await Promise.all([
    getCatalogueAuthorization(account),
    getReadyAsset(input.assetId),
    getSignedInRoomAuthority({
      account,
      roomId: input.roomId,
    }),
  ]);

  if (!asset) {
    throw new RoomMediaSessionError("Uploaded media asset was not found.", 404);
  }

  const allowedToStart = canStartUploadedMedia({
    account,
    assetStatus: asset.status,
    authorization,
    roomAuthority: authority.allowed ? "allowed" : "denied",
  });

  if (!allowedToStart || !authority.memberId) {
    throw new RoomMediaSessionError(
      "No permission to start uploaded media in this room.",
      403,
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = addHoursIso(now, ROOM_MEDIA_SESSION_TTL_HOURS);

  const { error: endExistingError } = await admin
    .from("room_media_sessions")
    .update({
      ended_at: nowIso,
      status: "ended",
    })
    .eq("room_id", input.roomId)
    .eq("status", "active");

  if (endExistingError) {
    throw endExistingError;
  }

  const { data: session, error: sessionError } = await admin
    .from("room_media_sessions")
    .insert({
      expires_at: expiresAt,
      media_asset_id: asset.id,
      room_id: input.roomId,
      started_at: nowIso,
      started_by_member_id: authority.memberId,
      started_by_user_id: account.id,
      status: "active",
    })
    .select("id, room_id, media_asset_id, status, expires_at")
    .single();

  if (sessionError) {
    throw sessionError;
  }

  return {
    assetId: session.media_asset_id,
    expiresAt: session.expires_at,
    id: session.id,
    roomId: session.room_id,
    status: session.status,
  };
}

export async function getRoomMediaPlaybackAccess(input: {
  roomId: string;
  sessionId: string;
}): Promise<RoomMediaPlaybackAccessResult> {
  const [participant, session] = await Promise.all([
    getCurrentRoomParticipant(input.roomId),
    getRoomMediaSession(input.sessionId),
  ]);

  const asset = session ? await getReadyAsset(session.media_asset_id) : null;
  const decision = canWatchRoomMedia({
    assetStatus: asset?.status ?? "missing",
    participant: participant
      ? {
          roomId: participant.roomId,
          status: "active",
        }
      : null,
    roomId: input.roomId,
    session: session
      ? {
          endedAt: session.ended_at,
          expiresAt: session.expires_at,
          roomId: session.room_id,
          status: session.status,
        }
      : null,
  });

  return {
    asset,
    decision,
    participant,
    session,
  };
}

export async function getRoomMediaGatewayAccess(input: {
  memberId: string;
  roomId: string;
  sessionId: string;
}): Promise<RoomMediaPlaybackAccessResult> {
  const admin = createSupabaseAdminClient();
  const [
    { data: member, error: memberError },
    { data: room, error: roomError },
    session,
  ] = await Promise.all([
    admin
      .from("room_members")
      .select("id,room_id")
      .eq("id", input.memberId)
      .eq("room_id", input.roomId)
      .maybeSingle(),
    admin
      .from("rooms")
      .select("id,status")
      .eq("id", input.roomId)
      .maybeSingle(),
    getRoomMediaSession(input.sessionId),
  ]);

  if (memberError) {
    throw memberError;
  }

  if (roomError) {
    throw roomError;
  }

  const asset = session ? await getReadyAsset(session.media_asset_id) : null;
  const participant =
    member && room?.status === "open"
      ? {
          memberId: member.id,
          roomId: member.room_id,
        }
      : null;
  const decision = canWatchRoomMedia({
    assetStatus: asset?.status ?? "missing",
    participant: participant
      ? {
          roomId: participant.roomId,
          status: "active",
        }
      : null,
    roomId: input.roomId,
    session: session
      ? {
          endedAt: session.ended_at,
          expiresAt: session.expires_at,
          roomId: session.room_id,
          status: session.status,
        }
      : null,
  });

  return {
    asset,
    decision,
    participant,
    session,
  };
}

async function getCatalogueAuthorization(account: AccountSummary) {
  if (
    account.status !== "signed-in" ||
    account.role === "owner" ||
    account.accountStatus !== "active"
  ) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("uploaded_catalogue_authorizations")
    .select("status,user_id")
    .eq("user_id", account.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getReadyAsset(assetId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .select("id,mime_type,processed_object_key,r2_object_key,status")
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getRoomMediaSession(sessionId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("room_media_sessions")
    .select("ended_at,expires_at,id,media_asset_id,room_id,status")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getSignedInRoomAuthority({
  account,
  roomId,
}: {
  account: Extract<AccountSummary, { status: "signed-in" }>;
  roomId: string;
}) {
  const admin = createSupabaseAdminClient();
  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;
  const [
    { data: room, error: roomError },
    { data: member, error: memberError },
  ] = await Promise.all([
    admin.from("rooms").select("id,status").eq("id", roomId).maybeSingle(),
    admin
      .from("room_members")
      .select("id,role,user_id")
      .eq("room_id", roomId)
      .eq("user_id", account.id)
      .maybeSingle(),
  ]);

  if (roomError) {
    throw roomError;
  }

  if (memberError) {
    throw memberError;
  }

  if (!room || room.status !== "open") {
    return {
      allowed: false,
      memberId: null,
    };
  }

  if (member) {
    return getRoomAuthorityForSignedInMember({
      account,
      member,
      roomId,
    });
  }

  const guestSession = token
    ? await reclaimGuestMembership({ roomId, token })
    : null;

  if (guestSession?.room.id === roomId && guestSession.room.status === "open") {
    return getRoomAuthorityForGuestMember({
      guestIdentityId: guestSession.guestIdentity.id,
      member: guestSession.member,
      roomId,
    });
  }

  return {
    allowed: false,
    memberId: null,
  };
}

async function getRoomAuthorityForSignedInMember({
  account,
  member,
  roomId,
}: {
  account: Extract<AccountSummary, { status: "signed-in" }>;
  member: Pick<Tables<"room_members">, "id" | "role" | "user_id">;
  roomId: string;
}) {
  if (member.role === "host") {
    return {
      allowed: true,
      memberId: member.id,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: permission, error: permissionError } = await admin
    .from("member_permissions")
    .select("can_control_playback")
    .eq("room_id", roomId)
    .eq("user_id", account.id)
    .maybeSingle();

  if (permissionError) {
    throw permissionError;
  }

  return {
    allowed: permission?.can_control_playback === true,
    memberId: member.id,
  };
}

async function getRoomAuthorityForGuestMember({
  guestIdentityId,
  member,
  roomId,
}: {
  guestIdentityId: string;
  member: Pick<Tables<"room_members">, "id" | "role">;
  roomId: string;
}) {
  if (member.role === "host") {
    return {
      allowed: true,
      memberId: member.id,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: permission, error: permissionError } = await admin
    .from("member_permissions")
    .select("can_control_playback")
    .eq("room_id", roomId)
    .eq("guest_identity_id", guestIdentityId)
    .maybeSingle();

  if (permissionError) {
    throw permissionError;
  }

  return {
    allowed: permission?.can_control_playback === true,
    memberId: member.id,
  };
}

async function getCurrentRoomParticipant(roomId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (token) {
    const guestSession = await reclaimGuestMembership({ roomId, token });

    if (guestSession) {
      return {
        memberId: guestSession.member.id,
        roomId: guestSession.room.id,
      };
    }
  }

  const account = await getAccountSummary();

  if (account.status !== "signed-in") {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data: member, error } = await admin
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", account.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return member
    ? {
        memberId: member.id,
        roomId,
      }
    : null;
}

function addHoursIso(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}
