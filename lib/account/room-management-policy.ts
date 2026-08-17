import type { AccountRoomSummary } from "./room-projection";

export type AccountRoomCommand = "archive" | "close" | "leave" | "remove-save";

type AccountRoomAuthorityInput = {
  command: AccountRoomCommand;
  hasMembership: boolean;
  ownerUserId: string | null;
  savedByUserId: string | null;
  status: string;
  userId: string;
};

export function canExecuteAccountRoomCommand({
  command,
  hasMembership,
  ownerUserId,
  savedByUserId,
  status,
  userId,
}: AccountRoomAuthorityInput) {
  if (command === "remove-save") {
    return savedByUserId === userId;
  }

  if (command === "leave") {
    return hasMembership && ownerUserId !== userId;
  }

  if (command === "close") {
    return ownerUserId === userId && status === "open";
  }

  return ownerUserId === userId && status === "closed";
}

export function getAccountRoomCommands(
  room: AccountRoomSummary,
): AccountRoomCommand[] {
  const commands: AccountRoomCommand[] = [];

  if (room.isSaved) {
    commands.push("remove-save");
  }

  if (room.relationship === "owned") {
    commands.push(room.status === "open" ? "close" : "archive");
  } else if (room.relationship === "joined") {
    commands.push("leave");
  }

  return commands;
}
