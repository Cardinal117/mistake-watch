import type { Tables } from "@/lib/supabase";

export function buildRoomInvitePath(
  room: Pick<Tables<"rooms">, "id">,
  inviteToken: string,
) {
  return `/rooms/${room.id}?invite=${encodeURIComponent(inviteToken)}`;
}

export function parseRoomInviteInput(input: string) {
  const normalized = input.trim();

  if (!normalized) {
    throw new Error("Enter a room invite link or code.");
  }

  try {
    const url = new URL(
      normalized,
      normalized.startsWith("/")
        ? "https://watch.mistakestudios.com"
        : undefined,
    );
    const match = url.pathname.match(/\/rooms\/([^/]+)/);
    const inviteToken = url.searchParams.get("invite");
    const inviteCode = url.searchParams.get("code") ?? undefined;

    if (match?.[1] && inviteToken) {
      return {
        inviteCode,
        inviteToken,
        roomId: decodeURIComponent(match[1]),
        type: "link" as const,
      };
    }
  } catch {
    // Plain invite code input is handled below.
  }

  return {
    inviteCode: normalized.toUpperCase(),
    type: "code" as const,
  };
}
