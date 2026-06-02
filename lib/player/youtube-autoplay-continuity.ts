export const YOUTUBE_NEAR_END_THRESHOLD_SECONDS = 1.5;
export const YOUTUBE_ENDED_GRACE_SECONDS = 2;

export type YouTubeAutoplayFallbackInput = {
  activeKey: string | null;
  alreadyAdvancedKey: string | null;
  canAdvance: boolean;
  durationSeconds: number | undefined;
  expectedPositionSeconds: number;
  hasNextItem: boolean;
  isPlaying: boolean;
  queueAutoplayEnabled: boolean;
};

export function shouldFallbackAdvanceYouTubeQueue({
  activeKey,
  alreadyAdvancedKey,
  canAdvance,
  durationSeconds,
  expectedPositionSeconds,
  hasNextItem,
  isPlaying,
  queueAutoplayEnabled,
}: YouTubeAutoplayFallbackInput) {
  if (
    !activeKey ||
    alreadyAdvancedKey === activeKey ||
    !canAdvance ||
    !hasNextItem ||
    !isPlaying ||
    !queueAutoplayEnabled ||
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return false;
  }

  return (
    expectedPositionSeconds >=
    durationSeconds + YOUTUBE_ENDED_GRACE_SECONDS
  );
}

export function isNearYouTubeEnd({
  durationSeconds,
  expectedPositionSeconds,
}: {
  durationSeconds: number | undefined;
  expectedPositionSeconds: number;
}) {
  return (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    expectedPositionSeconds >=
      durationSeconds - YOUTUBE_NEAR_END_THRESHOLD_SECONDS
  );
}
