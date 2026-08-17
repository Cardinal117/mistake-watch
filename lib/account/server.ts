import "server-only";

import { cookies } from "next/headers";

import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";

import type {
  AccountRole,
  AccountStatus,
  AccountSummary,
  AvatarSource,
} from "./types";

type AuthUser = {
  email?: string | null;
  id: string;
  user_metadata?: Record<string, unknown>;
};

export async function getAccountSummary(): Promise<AccountSummary> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { status: "guest" };
  }

  const profile = await ensureProfileForUser(data.user);

  return {
    accountStatus: normalizeAccountStatus(profile.account_status),
    avatarKey: profile.avatar_key,
    avatarSource: normalizeAvatarSource(profile.avatar_source),
    avatarUrl: profile.avatar_url,
    displayName: profile.display_name,
    email: data.user.email ?? null,
    googleAvatarUrl: profile.google_avatar_url,
    handle: profile.handle,
    id: profile.id,
    role: normalizeAccountRole(profile.role),
    status: "signed-in",
  };
}

export async function isCurrentAccountOwner() {
  const account = await getAccountSummary();

  return (
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active"
  );
}

export async function requireOwnerAccount() {
  if (!(await isCurrentAccountOwner())) {
    throw new Error("Owner account required.");
  }
}

export async function migrateCurrentGuestRoomToAccount(roomId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Sign in before attaching a guest room.");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;

  if (!token) {
    if (await isRoomAlreadyAttachedToUser(roomId, data.user.id)) {
      return {
        roomId,
        transferredOwnership: false,
      };
    }

    throw new Error("No current guest session was found for this room.");
  }

  const guestSession = await reclaimGuestMembership({ roomId, token });

  if (!guestSession) {
    if (await isRoomAlreadyAttachedToUser(roomId, data.user.id)) {
      return {
        roomId,
        transferredOwnership: false,
      };
    }

    throw new Error("This guest session is no longer available.");
  }

  const admin = createSupabaseAdminClient();
  const profile = await ensureProfileForUser(data.user);
  const now = new Date().toISOString();
  const ownershipTransferred =
    guestSession.member.role === "host" && !guestSession.room.owner_user_id;
  const savedRoomTransferred =
    guestSession.room.saved_by_guest_identity_id ===
    guestSession.guestIdentity.id;

  const { data: existingUserMember, error: existingUserMemberError } =
    await admin
      .from("room_members")
      .select()
      .eq("room_id", roomId)
      .eq("user_id", data.user.id)
      .maybeSingle();

  if (existingUserMemberError) {
    throw existingUserMemberError;
  }

  const targetMember = existingUserMember ?? guestSession.member;

  if (existingUserMember) {
    const { error: existingMemberUpdateError } = await admin
      .from("room_members")
      .update({
        display_name: profile.display_name,
        last_seen_at: now,
      })
      .eq("id", existingUserMember.id)
      .eq("user_id", data.user.id);

    if (existingMemberUpdateError) {
      throw existingMemberUpdateError;
    }

    const { error: guestPermissionDeleteError } = await admin
      .from("member_permissions")
      .delete()
      .eq("room_id", roomId)
      .eq("guest_identity_id", guestSession.guestIdentity.id);

    if (guestPermissionDeleteError) {
      throw guestPermissionDeleteError;
    }

    const { error: redundantMemberDeleteError } = await admin
      .from("room_members")
      .delete()
      .eq("id", guestSession.member.id)
      .eq("guest_identity_id", guestSession.guestIdentity.id);

    if (redundantMemberDeleteError) {
      throw redundantMemberDeleteError;
    }
  } else {
    const { error: memberUpdateError } = await admin
      .from("room_members")
      .update({
        display_name: profile.display_name,
        guest_identity_id: null,
        last_seen_at: now,
        linked_from_guest_identity_id: guestSession.guestIdentity.id,
        user_id: data.user.id,
      })
      .eq("id", guestSession.member.id);

    if (memberUpdateError) {
      throw memberUpdateError;
    }

    const { error: permissionUpdateError } = await admin
      .from("member_permissions")
      .update({
        guest_identity_id: null,
        user_id: data.user.id,
      })
      .eq("room_id", roomId)
      .eq("guest_identity_id", guestSession.guestIdentity.id);

    if (permissionUpdateError) {
      throw permissionUpdateError;
    }
  }

  if (ownershipTransferred || savedRoomTransferred) {
    const { error: roomUpdateError } = await admin
      .from("rooms")
      .update({
        last_active_at: now,
        owner_user_id: ownershipTransferred
          ? data.user.id
          : guestSession.room.owner_user_id,
        saved_by_guest_identity_id: savedRoomTransferred
          ? null
          : guestSession.room.saved_by_guest_identity_id,
        saved_by_user_id: savedRoomTransferred
          ? data.user.id
          : guestSession.room.saved_by_user_id,
      })
      .eq("id", roomId);

    if (roomUpdateError) {
      throw roomUpdateError;
    }
  }

  const { error: migrationError } = await admin
    .from("account_guest_migrations")
    .upsert(
      {
        guest_identity_id: guestSession.guestIdentity.id,
        migrated_avatar_key: profile.avatar_key,
        migrated_display_name: profile.display_name,
        ownership_transferred: ownershipTransferred,
        room_id: roomId,
        room_member_id: targetMember.id,
        saved_room_transferred: savedRoomTransferred,
        user_id: data.user.id,
      },
      { onConflict: "user_id,guest_identity_id" },
    );

  if (migrationError) {
    throw migrationError;
  }

  return {
    roomId,
    transferredOwnership: ownershipTransferred,
  };
}

async function isRoomAlreadyAttachedToUser(roomId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .or(`owner_user_id.eq.${userId},saved_by_user_id.eq.${userId}`)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (room) {
    return true;
  }

  const { data: member, error: memberError } = await admin
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (member) {
    return true;
  }

  const { data: migration, error: migrationError } = await admin
    .from("account_guest_migrations")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (migrationError) {
    throw migrationError;
  }

  return Boolean(migration);
}

async function ensureProfileForUser(
  user: AuthUser,
): Promise<Tables<"profiles">> {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select()
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const profileName = deriveDisplayName(user);
  const googleAvatarUrl = deriveGoogleAvatarUrl(user);

  const { data: created, error: createError } = await admin
    .from("profiles")
    .insert({
      avatar_source: googleAvatarUrl ? "google_avatar" : "guest_avatar",
      avatar_url: googleAvatarUrl,
      display_name: profileName,
      google_avatar_url: googleAvatarUrl,
      id: user.id,
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

function deriveDisplayName(user: AuthUser) {
  const metadataName =
    readStringMetadata(user, "full_name") ?? readStringMetadata(user, "name");
  const emailName = user.email?.split("@")[0];
  const name = metadataName ?? emailName ?? "Mistake member";

  return name.trim().replace(/\s+/g, " ").slice(0, 80) || "Mistake member";
}

function deriveGoogleAvatarUrl(user: AuthUser) {
  return (
    readStringMetadata(user, "picture") ??
    readStringMetadata(user, "avatar_url") ??
    null
  );
}

function readStringMetadata(user: AuthUser, key: string) {
  const value = user.user_metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAccountRole(role: string): AccountRole {
  return role === "owner" ? "owner" : "member";
}

function normalizeAccountStatus(status: string): AccountStatus {
  return status === "disabled" ? "disabled" : "active";
}

function normalizeAvatarSource(source: string): AvatarSource {
  if (source === "google_avatar" || source === "custom") {
    return source;
  }

  return "guest_avatar";
}
