import "server-only";

export function canUseCompactPlayback(
  user: { id: string; identities?: Array<{ provider: string }> },
  accountStatus: string,
) {
  const allowed = (process.env.COMPACT_PLAYBACK_ACCOUNT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return (
    accountStatus === "active" &&
    user.identities?.some((identity) => identity.provider === "google") ===
      true &&
    allowed.includes(user.id)
  );
}
