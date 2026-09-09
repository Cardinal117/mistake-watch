"use server";

import { cleanupPersistentRooms } from "@/lib/rooms/persistent-retirement";
import { leaveSharedRoomAction } from "@/lib/rooms/shared-actions";

import { canAccessAccountRoom } from "@/lib/rooms/personal-access";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase";

import {
  canExecuteAccountRoomCommand,
  type AccountRoomCommand,
} from "./room-management-policy";

type ManageAccountRoomInput = {
  command: AccountRoomCommand;
  roomId: string;
};

export async function manageAccountRoomAction({
  command,
  roomId,
}: ManageAccountRoomInput) {
  if (!isUuid(roomId)) {
    throw new Error("A valid room is required.");
  }

  const serverClient = await createSupabaseServerClient();
  const { data: authData, error: authError } =
    await serverClient.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Sign in to manage account rooms.");
  }

  const admin = createSupabaseAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select(
      "id, is_saved, owner_user_id, saved_by_guest_identity_id, saved_by_user_id, status, room_kind",
    )
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    throw new Error("This room is no longer available.");
  }

  // Withdrawal must remain retryable after durable access has already ended.
  // The RPC authenticates the caller and rejects owner/foreign-room requests.
  if (room.room_kind === "shared" && command === "leave") {
    const result = await leaveSharedRoomAction(roomId);
    if (result.error) throw new Error(result.error);
    return { command, roomId };
  }
  if (!(await canAccessAccountRoom(room))) {
    throw new Error("This account cannot perform that room action.");
  }
  const { data: member, error: memberError } = await admin
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (
    !canExecuteAccountRoomCommand({
      command,
      kind: room.room_kind,
      hasMembership: Boolean(member),
      ownerUserId: room.owner_user_id,
      savedByUserId: room.saved_by_user_id,
      status: room.status,
      userId: authData.user.id,
    })
  ) {
    throw new Error("This account cannot perform that room action.");
  }

  if (command === "remove-save") {
    await removeAccountSave({
      hasGuestSave: Boolean(room.saved_by_guest_identity_id),
      roomId,
      status: room.status,
      userId: authData.user.id,
    });
  } else if (command === "leave") {
    await leaveAccountRoom({
      memberId: member?.id ?? "",
      roomId,
      userId: authData.user.id,
    });
  } else {
    await updateOwnedRoomStatus({
      command,
      roomId,
      userId: authData.user.id,
    });
    if (room.room_kind !== "temporary") {
      try {
        const result = await cleanupPersistentRooms(roomId);
        if (result.failed) throw new Error("Pending retirement");
      } catch {
        throw new Error(
          "The room is closed. Ending connected sessions is still pending and will be retried. Refresh to see the updated room status.",
        );
      }
    }
  }

  return { command, roomId };
}

async function removeAccountSave({
  hasGuestSave,
  roomId,
  status,
  userId,
}: {
  hasGuestSave: boolean;
  roomId: string;
  status: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const { data, error } = await admin
    .from("rooms")
    .update({
      idle_deadline_at:
        status === "open" && !hasGuestSave ? addHoursIso(now, 1) : null,
      is_saved: hasGuestSave,
      saved_by_user_id: null,
      updated_at: now.toISOString(),
    })
    .eq("id", roomId)
    .eq("saved_by_user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data)
    throw new Error("The saved-room state changed. Refresh and retry.");
}

async function leaveAccountRoom({
  memberId,
  roomId,
  userId,
}: {
  memberId: string;
  roomId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("room_members")
    .delete()
    .eq("id", memberId)
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("The room membership changed. Refresh and retry.");

  const cleanupResults = await Promise.all([
    admin
      .from("member_permissions")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId),
    admin
      .from("account_guest_migrations")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId),
  ]);
  const cleanupError = cleanupResults.find((result) => result.error)?.error;

  if (cleanupError) throw cleanupError;
}

async function updateOwnedRoomStatus({
  command,
  roomId,
  userId,
}: {
  command: "archive" | "close";
  roomId: string;
  userId: string;
}) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const nextStatus = command === "close" ? "closed" : "archived";
  const expectedStatus = command === "close" ? "open" : "closed";
  const { data, error } = await admin
    .from("rooms")
    .update({
      close_reason: command === "close" ? "host_closed" : undefined,
      closed_at: command === "close" ? now : undefined,
      idle_deadline_at: null,
      is_saved: false,
      saved_by_guest_identity_id: null,
      saved_by_user_id: null,
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", roomId)
    .eq("owner_user_id", userId)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("The room state changed. Refresh and retry.");
}

function addHoursIso(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
