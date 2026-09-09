"use server";

import { after } from "next/server";
import {
  cleanupPersistentRooms,
  hasPersistentRoomEnded,
} from "./persistent-retirement";

import { createTemporaryRoom } from "@/lib/identity/temporary-room";
import { accessTemporaryRoom, hasTemporaryRoomEnded } from "./temporary";
import { hashRoomScopedToken } from "@/lib/identity/guest-token";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  getAccountSummary,
  migrateCurrentGuestRoomToAccount,
} from "@/lib/account";
import {
  createGuestHostedRoom,
  getGuestIdentityCookieName,
  joinRoomAsGuestByInviteCode,
  joinRoomAsGuestByInviteLink,
  reclaimGuestMembership,
} from "@/lib/identity";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  type Tables,
} from "@/lib/supabase";

import { canAccessAccountRoom } from "./personal-access";
import { touchSignedInRoomActivity } from "./activity";
import { buildRoomInvitePath, parseRoomInviteInput } from "./invite";

const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function createRoomAction(formData: FormData) {
  let redirectPath = "/";

  try {
    // Older forms still create Legacy; Temporary has its own default-off gate.
    const roomKind = formData.get("room-kind");
    if (
      roomKind !== null &&
      roomKind !== "legacy" &&
      !(
        roomKind === "temporary" &&
        process.env.TEMPORARY_ROOMS_ENABLED === "true"
      )
    ) {
      throw new Error("This room type is not available yet.");
    }
    if (roomKind === "temporary") {
      const account = await getAccountSummary();
      if (account.status === "signed-in" && account.accountStatus !== "active")
        throw new Error("An active account is required.");
    }
    const roomName = readFormString(formData, "room-name");
    const displayName = readFormString(formData, "display-name");
    const mode =
      readFormString(formData, "room-mode") === "listen" ? "listen" : "watch";
    const session = await (
      roomKind === "temporary" ? createTemporaryRoom : createGuestHostedRoom
    )({
      displayName,
      mode,
      roomName,
    });

    await setGuestCookie(session.tokenCookieName, session.token);
    await attachRoomToCurrentAccountIfSignedIn(session.room.id);
    redirectPath = buildRoomInvitePath(session.room, session.inviteToken);
  } catch (error) {
    if (isRedirectError(error)) throw error;
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
    // Shared invite codes/links lead to account approval, never guest creation.
    const admin = createSupabaseAdminClient();
    const query = admin
      .from("rooms")
      .select("id,invite_code")
      .eq("room_kind", "shared")
      .eq("status", "open");
    const { data: shared } = await (
      parsedInvite.type === "link"
        ? query
            .eq("id", parsedInvite.roomId)
            .eq("invite_code", parsedInvite.inviteToken)
        : query.eq("invite_code", parsedInvite.inviteCode.toLowerCase())
    ).maybeSingle();
    if (shared)
      redirect(
        `/rooms/${shared.id}?invite=${encodeURIComponent(shared.invite_code)}`,
      );
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
    await attachRoomToCurrentAccountIfSignedIn(session.room.id);
    redirectPath = `/rooms/${session.room.id}`;
  } catch (error) {
    if (isRedirectError(error)) throw error;
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
    await attachRoomToCurrentAccountIfSignedIn(session.room.id);
    redirectPath = `/rooms/${session.room.id}`;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect(`/?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }

  redirect(redirectPath);
}

export async function renameRoomAction(input: {
  roomId: string;
  roomName: string;
}) {
  const roomName = normalizeRoomName(input.roomName);
  await requireRoomHostAuthority(
    input.roomId,
    "Only the host can rename the room.",
  );

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
  const { data: kind } = await createSupabaseAdminClient()
    .from("rooms")
    .select("room_kind")
    .eq("id", input.roomId)
    .maybeSingle();
  if (kind?.room_kind === "temporary")
    throw new Error("Temporary rooms cannot be saved.");
  await attachRoomToCurrentAccountIfSignedIn(input.roomId);
  const authority = await requireRoomHostAuthority(
    input.roomId,
    "Only the host can save this room.",
  );
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const { error } = await supabase
    .from("rooms")
    .update({
      idle_deadline_at: input.saved ? null : addHoursIso(now, 1),
      is_saved: input.saved,
      last_active_at: now.toISOString(),
      saved_by_guest_identity_id:
        input.saved && authority.kind === "guest"
          ? authority.guestIdentityId
          : null,
      saved_by_user_id:
        input.saved && authority.kind === "account" ? authority.userId : null,
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
  await requireRoomHostAuthority(
    input.roomId,
    "Only the host can change room mode.",
  );

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
  const admin = createSupabaseAdminClient();
  const { data: kind, error } = await admin
    .from("rooms")
    .select("room_kind,status")
    .eq("id", input.roomId)
    .maybeSingle();
  if (error) throw error;
  if (
    (!kind || kind.room_kind !== "temporary") &&
    (await hasPersistentRoomEnded(input.roomId))
  ) {
    after(async () => {
      await cleanupPersistentRooms(input.roomId).catch(() => null);
    });
    return { touched: false, ended: true };
  }
  if (!kind)
    return {
      touched: false,
      expired: await hasTemporaryRoomEnded(input.roomId),
    };
  if (kind.room_kind === "temporary") {
    if (await hasTemporaryRoomEnded(input.roomId))
      return { touched: false, expired: true };
    const account = await getAccountSummary();
    if (
      account.status === "signed-in" &&
      account.accountStatus === "active" &&
      !account.isAnonymous
    ) {
      const { data: member } = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", input.roomId)
        .eq("user_id", account.id)
        .maybeSingle();
      if (member) {
        const touched = await accessTemporaryRoom({
          roomId: input.roomId,
          memberId: member.id,
          accountId: account.id,
        });
        return {
          touched,
          expired: !touched && (await hasTemporaryRoomEnded(input.roomId)),
        };
      }
    }
    const token = (await cookies()).get(
      getGuestIdentityCookieName(input.roomId),
    )?.value;
    if (token) {
      const { data: guest } = await admin
        .from("guest_identities")
        .select("id")
        .eq("room_id", input.roomId)
        .eq("token_hash", hashRoomScopedToken(input.roomId, token))
        .maybeSingle();
      const { data: member } = guest
        ? await admin
            .from("room_members")
            .select("id")
            .eq("room_id", input.roomId)
            .eq("guest_identity_id", guest.id)
            .maybeSingle()
        : { data: null };
      if (member) {
        const touched = await accessTemporaryRoom({
          roomId: input.roomId,
          memberId: member.id,
          guestHash: hashRoomScopedToken(input.roomId, token),
        });
        return {
          touched,
          expired: !touched && (await hasTemporaryRoomEnded(input.roomId)),
        };
      }
    }
    return { touched: false, expired: false };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getGuestIdentityCookieName(input.roomId),
  )?.value;

  if (token) {
    const session = await reclaimGuestMembership({
      roomId: input.roomId,
      token,
    });

    if (session) {
      return { touched: true };
    }
  }

  return {
    touched: await touchSignedInRoomActivity(input.roomId),
  };
}

async function requireRoomHostAuthority(roomId: string, deniedMessage: string) {
  const accountAuthority = await getSignedInHostAuthority(roomId);

  if (accountAuthority) {
    return accountAuthority;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (token) {
    const session = await reclaimGuestMembership({
      roomId,
      token,
    });

    if (session?.member.role === "host") {
      return {
        guestIdentityId: session.guestIdentity.id,
        kind: "guest" as const,
        memberId: session.member.id,
      };
    }
  }

  throw new Error(deniedMessage);
}

async function attachRoomToCurrentAccountIfSignedIn(roomId: string) {
  const account = await getAccountSummary();

  if (account.status === "signed-in") {
    await migrateCurrentGuestRoomToAccount(roomId);
  }
}

async function getSignedInHostAuthority(roomId: string) {
  const serverClient = await createSupabaseServerClient();
  const { data, error } = await serverClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, owner_user_id, status, room_kind")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room || room.status !== "open") {
    return null;
  }

  if (!(await canAccessAccountRoom(room))) return null;

  const { data: member, error: memberError } = await supabase
    .from("room_members")
    .select("id, role, user_id")
    .eq("room_id", roomId)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (
    !member ||
    !isHostAccountAuthority({ member, room, userId: data.user.id })
  ) {
    return null;
  }

  return {
    kind: "account" as const,
    memberId: member.id,
    userId: data.user.id,
  };
}

function isHostAccountAuthority({
  member,
  room,
  userId,
}: {
  member: Pick<Tables<"room_members">, "id" | "role" | "user_id"> | null;
  room: Pick<Tables<"rooms">, "owner_user_id">;
  userId: string;
}) {
  return Boolean(
    member &&
    member.role === "host" &&
    member.user_id === userId &&
    room.owner_user_id === userId,
  );
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
