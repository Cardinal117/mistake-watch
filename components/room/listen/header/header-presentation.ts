type HeaderParticipant = {
  id: string;
  status: "idle" | "online";
};

export function deriveListenHeaderPresentation<
  Participant extends HeaderParticipant,
>({
  canManageAuthority,
  maxVisibleParticipants = 3,
  participants,
}: {
  canManageAuthority: boolean;
  maxVisibleParticipants?: number;
  participants: Participant[];
}) {
  const onlineParticipants = participants.filter(
    (participant) => participant.status === "online",
  );
  const visibleParticipants = onlineParticipants.slice(
    0,
    Math.max(0, maxVisibleParticipants),
  );

  return {
    actions: {
      canOpenAudience: participants.length > 0,
      canSaveRoom: canManageAuthority,
    },
    hiddenParticipantCount: Math.max(
      0,
      participants.length - visibleParticipants.length,
    ),
    onlineParticipantCount: onlineParticipants.length,
    totalParticipantCount: participants.length,
    visibleParticipants,
  };
}
