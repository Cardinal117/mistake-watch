export function clampPositionSeconds(positionSeconds: number) {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return 0;
  return positionSeconds;
}

export function normalizePlaybackStatus(status: string) {
  return status === "playing" ||
    status === "buffering" ||
    status === "ended" ||
    status === "error"
    ? status
    : "paused";
}

export function normalizeSourceType(sourceType: string) {
  return sourceType === "hls" || sourceType === "youtube"
    ? sourceType
    : "direct";
}

export function normalizeSourceUrl(sourceUrl: string) {
  return sourceUrl.trim();
}

export function normalizeRoomMode(mode: string) {
  return mode === "listen" ? "listen" : "watch";
}

export function normalizeQueueMode(mode: string) {
  return mode === "shuffle" ||
    mode === "smartShuffle" ||
    mode === "loop" ||
    mode === "autoplayRelated"
    ? mode
    : "normal";
}

export function normalizeDurationSeconds(durationSeconds: number | undefined) {
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return undefined;
  }
  return Math.max(0, Math.trunc(durationSeconds));
}

export function normalizeRoomName(roomName: string) {
  const normalized = roomName.trim().replace(/\s+/g, " ");
  return !normalized || normalized.length > 120 ? "Untitled room" : normalized;
}

export function normalizeAvatarKey(avatarKey: string | undefined) {
  return avatarKey === "audio" ||
    avatarKey === "controller" ||
    avatarKey === "cooling" ||
    avatarKey === "memory" ||
    avatarKey === "network" ||
    avatarKey === "power" ||
    avatarKey === "processor" ||
    avatarKey === "storage"
    ? avatarKey
    : undefined;
}

export function normalizeChatText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > 500 ? normalized.slice(0, 500).trim() : normalized;
}
