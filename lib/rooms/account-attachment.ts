type RoomAccountAttachmentInput = {
  accountUserId?: string | null;
  memberUserIds: readonly (string | null)[];
  ownerUserId?: string | null;
  savedByUserId?: string | null;
};

export function isRoomAttachedToAccount({
  accountUserId,
  memberUserIds,
  ownerUserId,
  savedByUserId,
}: RoomAccountAttachmentInput) {
  if (!accountUserId) {
    return false;
  }

  return (
    ownerUserId === accountUserId ||
    savedByUserId === accountUserId ||
    memberUserIds.includes(accountUserId)
  );
}
