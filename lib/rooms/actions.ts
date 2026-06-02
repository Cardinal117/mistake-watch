"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createGuestHostedRoom,
  getGuestIdentityCookieName,
  joinRoomAsGuestByInviteCode,
  joinRoomAsGuestByInviteLink,
  reclaimGuestMembership,
} from "@/lib/identity";
import { createSupabaseAdminClient } from "@/lib/supabase";

import { buildRoomInvitePath, parseRoomInviteInput } from "./invite";

const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function createRoomAction(formData: FormData) {
  let redirectPath = "/";

  try {
    const roomName = readFormString(formData, "room-name");
    const displayName = readFormString(formData, "display-name");
    const mode =
      readFormString(formData, "room-mode") === "listen" ? "listen" : "watch";
    const session = await createGuestHostedRoom({
      displayName,
      mode,
      roomName,
    });

    await setGuestCookie(session.tokenCookieName, session.token);
    redirectPath = buildRoomInvitePath(session.room, session.inviteToken);
  } catch (error) {
    redirect(`/?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  redirect(redirectPath);
}

export async function joinRoomAction(formData: FormData) {
  let redirectPath = "/";

  try {
    const displayName = readFormString(formData, "display-name");
    const roomInvite = readFormString(formData, "room-invite");
    const parsedInvite = parseRoomInviteInput(roomInvite);
    const session =
      parsedInvite.type === "link"
        ? await joinRoomAsGuestByInviteLink({
            displayName,
            inviteToken: parsedInvite.inviteToken,
            roomId: parsedInvite.roomId,
          })
        : await joinRoomAsGuestByInviteCode({
            displayName,
            inviteCode: parsedInvite.inviteCode,
          });

    await setGuestCookie(session.tokenCookieName, session.token);
    redirectPath = `/rooms/${session.room.id}`;
  } catch (error) {
    redirect(`/?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  redirect(redirectPath);
}

export async function joinRoomFromInviteAction(formData: FormData) {
  let redirectPath = "/";

  try {
    const displayName = readFormString(formData, "display-name");
    const roomId = readFormString(formData, "room-id");
    const inviteToken = getOptionalFormString(formData, "invite-token");
    const inviteCode = getOptionalFormString(formData, "invite-code");
    const session = inviteToken
      ? await joinRoomAsGuestByInviteLink({ displayName, inviteToken, roomId })
      : await joinRoomAsGuestByInviteCode({
          displayName,
          inviteCode: inviteCode ?? "",
        });

    await setGuestCookie(session.tokenCookieName, session.token);
    redirectPath = `/rooms/${session.room.id}`;
  } catch (error) {
    redirect(`/?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  redirect(redirectPath);
}

export async function renameRoomAction(input: {
  roomId: string;
  roomName: string;
}) {
  const roomName = normalizeRoomName(input.roomName);
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getGuestIdentityCookieName(input.roomId),
  )?.value;

  if (!token) {
    throw new Error("You need to be in the room before renaming it.");
  }

  const session = await reclaimGuestMembership({
    roomId: input.roomId,
    token,
  });

  if (!session || session.member.role !== "host") {
    throw new Error("Only the host can rename the room.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      last_active_at: new Date().toISOString(),
      name: roomName,
    })
    .eq("id", input.roomId);

  if (error) {
    throw error;
  }

  return { roomName };
}

export async function setRoomSavedAction(input: {
  roomId: string;
  saved: boolean;
}) {
  const session = await requireHostSession(input.roomId);
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const { error } = await supabase
    .from("rooms")
    .update({
      idle_deadline_at: input.saved ? null : addHoursIso(now, 1),
      is_saved: input.saved,
      last_active_at: now.toISOString(),
      saved_by_guest_identity_id: input.saved ? session.guestIdentity.id : null,
      saved_by_user_id: null,
    })
    .eq("id", input.roomId);

  if (error) {
    throw error;
  }

  return { isSaved: input.saved };
}

export async function setRoomModeAction(input: {
  mode: "listen" | "watch";
  roomId: string;
}) {
  await requireHostSession(input.roomId);

  const mode: "listen" | "watch" = input.mode === "listen" ? "listen" : "watch";
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      last_active_at: new Date().toISOString(),
      mode,
    })
    .eq("id", input.roomId);

  if (error) {
    throw error;
  }

  return { mode };
}

export async function touchRoomActivityAction(input: { roomId: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getGuestIdentityCookieName(input.roomId),
  )?.value;

  if (!token) {
    return { touched: false };
  }

  const session = await reclaimGuestMembership({
    roomId: input.roomId,
    token,
  });

  return { touched: Boolean(session) };
}

async function requireHostSession(roomId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (!token) {
    throw new Error("You need to be in the room before changing saved state.");
  }

  const session = await reclaimGuestMembership({
    roomId,
    token,
  });

  if (!session || session.member.role !== "host") {
    throw new Error("Only the host can save this room.");
  }

  return session;
}

async function setGuestCookie(name: string, token: string) {
  const cookieStore = await cookies();

  cookieStore.set(name, token, {
    httpOnly: true,
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function readFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${name.replace(/-/g, " ")}.`);
  }

  return value.trim();
}

function getOptionalFormString(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Room action failed.";
}

function normalizeRoomName(roomName: string) {
  const normalized = roomName.trim().replace(/\s+/g, " ");

  if (normalized.length < 1 || normalized.length > 120) {
    throw new Error("Room name must be between 1 and 120 characters.");
  }

  return normalized;
}

function addHoursIso(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}
