import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import { closeIdleUnsavedRooms } from "@/lib/rooms/lifecycle";

import {
  createGuestTokenBundle,
  createInviteCode,
  createOpaqueToken,
  getGuestIdentityCookieName,
  hashInviteToken,
  hashRoomScopedToken,
  normalizeDisplayName,
} from "./guest-token";

export type RoomMode = "watch" | "listen" | "browser";

export type GuestRoomSession = {
  guestIdentity: Tables<"guest_identities">;
  member: Tables<"room_members">;
  room: Tables<"rooms">;
  token: string;
  tokenCookieName: string;
};

export type CreatedGuestRoom = GuestRoomSession & {
  inviteCode: string;
  inviteToken: string;
};

export type CreateGuestHostedRoomInput = {
  displayName: string;
  mode?: RoomMode;
  roomName: string;
};

export type JoinRoomAsGuestInput = {
  displayName: string;
  inviteCode: string;
  inviteToken: string;
};

export type JoinRoomAsGuestByInviteCodeInput = {
  displayName: string;
  inviteCode: string;
};

export type JoinRoomAsGuestByInviteLinkInput = {
  displayName: string;
  inviteToken: string;
  roomId: string;
};

export type ReclaimGuestMembershipInput = {
  roomId: string;
  token: string;
};

export async function createGuestHostedRoom({
  displayName,
  mode = "watch",
  roomName,
}: CreateGuestHostedRoomInput): Promise<CreatedGuestRoom> {
  const supabase = createSupabaseAdminClient();
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedRoomName = normalizeRoomName(roomName);
  const inviteToken = createOpaqueToken();

  let createdRoomId: string | null = null;

  try {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        idle_deadline_at: addHoursIso(new Date(), 1),
        invite_code: createInviteCode(),
        invite_token_hash: hashInviteToken(inviteToken),
        last_active_at: new Date().toISOString(),
        mode,
        name: normalizedRoomName,
        owner_user_id: null,
        privacy: "invite",
        status: "open",
      })
      .select()
      .single();

    if (roomError) {
      throw roomError;
    }

    createdRoomId = room.id;

    const tokenBundle = createGuestTokenBundle(room.id);

    const { data: guestIdentity, error: guestError } = await supabase
      .from("guest_identities")
      .insert({
        display_name: normalizedDisplayName,
        last_seen_at: new Date().toISOString(),
        room_id: room.id,
        token_hash: tokenBundle.tokenHash,
      })
      .select()
      .single();

    if (guestError) {
      throw guestError;
    }

    const { data: member, error: memberError } = await supabase
      .from("room_members")
      .insert({
        display_name: normalizedDisplayName,
        guest_identity_id: guestIdentity.id,
        last_seen_at: new Date().toISOString(),
        role: "host",
        room_id: room.id,
      })
      .select()
      .single();

    if (memberError) {
      throw memberError;
    }

    const { error: settingsError } = await supabase
      .from("room_settings")
      .insert({
        room_id: room.id,
      });

    if (settingsError) {
      throw settingsError;
    }

    return {
      guestIdentity,
      inviteCode: room.invite_code,
      inviteToken,
      member,
      room,
      token: tokenBundle.token,
      tokenCookieName: tokenBundle.cookieName,
    };
  } catch (error) {
    if (createdRoomId) {
      await supabase.from("rooms").delete().eq("id", createdRoomId);
    }

    throw error;
  }
}

export async function joinRoomAsGuest({
  displayName,
  inviteCode,
  inviteToken,
}: JoinRoomAsGuestInput): Promise<GuestRoomSession> {
  await closeIdleUnsavedRooms();

  const supabase = createSupabaseAdminClient();
  const normalizedDisplayName = normalizeDisplayName(displayName);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("invite_code", normalizeInviteCode(inviteCode))
    .eq("invite_token_hash", hashInviteToken(inviteToken))
    .eq("status", "open")
    .single();

  if (roomError) {
    throw roomError;
  }

  return createGuestMembership({
    displayName: normalizedDisplayName,
    room,
  });
}

export async function joinRoomAsGuestByInviteCode({
  displayName,
  inviteCode,
}: JoinRoomAsGuestByInviteCodeInput): Promise<GuestRoomSession> {
  await closeIdleUnsavedRooms();

  const supabase = createSupabaseAdminClient();
  const normalizedDisplayName = normalizeDisplayName(displayName);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("invite_code", normalizeInviteCode(inviteCode))
    .eq("status", "open")
    .single();

  if (roomError) {
    throw roomError;
  }

  return createGuestMembership({
    displayName: normalizedDisplayName,
    room,
  });
}

export async function joinRoomAsGuestByInviteLink({
  displayName,
  inviteToken,
  roomId,
}: JoinRoomAsGuestByInviteLinkInput): Promise<GuestRoomSession> {
  await closeIdleUnsavedRooms();

  const supabase = createSupabaseAdminClient();
  const normalizedDisplayName = normalizeDisplayName(displayName);

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .eq("invite_token_hash", hashInviteToken(inviteToken))
    .eq("status", "open")
    .single();

  if (roomError) {
    throw roomError;
  }

  return createGuestMembership({
    displayName: normalizedDisplayName,
    room,
  });
}

async function createGuestMembership({
  displayName,
  room,
}: {
  displayName: string;
  room: Tables<"rooms">;
}): Promise<GuestRoomSession> {
  const supabase = createSupabaseAdminClient();
  const tokenBundle = createGuestTokenBundle(room.id);
  let guestIdentityId: string | null = null;

  const { data: guestIdentity, error: guestError } = await supabase
    .from("guest_identities")
    .insert({
      display_name: displayName,
      last_seen_at: new Date().toISOString(),
      room_id: room.id,
      token_hash: tokenBundle.tokenHash,
    })
    .select()
    .single();

  if (guestError) {
    throw guestError;
  }

  guestIdentityId = guestIdentity.id;

  try {
    const { data: member, error: memberError } = await supabase
      .from("room_members")
      .insert({
        display_name: displayName,
        guest_identity_id: guestIdentity.id,
        last_seen_at: new Date().toISOString(),
        role: "guest",
        room_id: room.id,
      })
      .select()
      .single();

    if (memberError) {
      throw memberError;
    }

    await supabase
      .from("rooms")
      .update({
        idle_deadline_at: room.is_saved ? null : addHoursIso(new Date(), 1),
        last_active_at: new Date().toISOString(),
      })
      .eq("id", room.id);

    return {
      guestIdentity,
      member,
      room,
      token: tokenBundle.token,
      tokenCookieName: tokenBundle.cookieName,
    };
  } catch (error) {
    if (guestIdentityId) {
      await supabase
        .from("guest_identities")
        .delete()
        .eq("id", guestIdentityId);
    }

    throw error;
  }
}

export async function reclaimGuestMembership({
  roomId,
  token,
}: ReclaimGuestMembershipInput): Promise<GuestRoomSession | null> {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashRoomScopedToken(roomId, token);
  const seenAt = new Date().toISOString();

  const { data: guestIdentity, error: guestError } = await supabase
    .from("guest_identities")
    .select()
    .eq("room_id", roomId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (guestError) {
    throw guestError;
  }

  if (!guestIdentity) {
    return null;
  }

  const { data: member, error: memberError } = await supabase
    .from("room_members")
    .select()
    .eq("room_id", roomId)
    .eq("guest_identity_id", guestIdentity.id)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (!member) {
    return null;
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .single();

  if (roomError) {
    throw roomError;
  }

  if (room.status !== "open") {
    return null;
  }

  await Promise.all([
    supabase
      .from("guest_identities")
      .update({ last_seen_at: seenAt })
      .eq("id", guestIdentity.id),
    supabase
      .from("room_members")
      .update({ last_seen_at: seenAt })
      .eq("id", member.id),
    supabase
      .from("rooms")
      .update({
        idle_deadline_at: room.is_saved ? null : addHoursIso(new Date(), 1),
        last_active_at: seenAt,
      })
      .eq("id", roomId),
  ]);

  return {
    guestIdentity: {
      ...guestIdentity,
      last_seen_at: seenAt,
    },
    member: {
      ...member,
      last_seen_at: seenAt,
    },
    room: {
      ...room,
      last_active_at: seenAt,
    },
    token,
    tokenCookieName: getGuestIdentityCookieName(roomId),
  };
}

function addHoursIso(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase();
}

function normalizeRoomName(roomName: string) {
  const normalized = roomName.trim().replace(/\s+/g, " ");

  if (normalized.length < 1 || normalized.length > 120) {
    throw new Error("Room name must be between 1 and 120 characters.");
  }

  return normalized;
}
