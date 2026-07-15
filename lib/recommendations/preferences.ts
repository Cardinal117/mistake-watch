export const explicitLikeWeightCap = 4;

export type MediaPreferenceState = "liked" | "neutral";

export const preferenceScopeContract = {
  account: "private account-scoped durable state",
  guest: "private room-session-scoped ephemeral state",
} as const;

export function nextPreferenceState(
  current: MediaPreferenceState,
  liked: boolean,
): MediaPreferenceState {
  if (liked) {
    return "liked";
  }

  return current === "liked" ? "neutral" : current;
}
