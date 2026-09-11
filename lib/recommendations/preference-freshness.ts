/** Occurrence times share the room authority clock; revisions are room-local. */
export function durablePreferenceIsNewer(
  durableAtMs: number | undefined,
  liveAtMs: number | undefined,
) {
  return (
    Number.isFinite(durableAtMs) &&
    (!Number.isFinite(liveAtMs) || durableAtMs! >= liveAtMs!)
  );
}

// Durable neutral markers expire 30 days after ingestion. A still-live room
// row predating that window cannot safely replace an absent account record.
export function isExpiredAccountOverlay(
  updatedAtMs: number | undefined,
  nowMs: number,
) {
  return (
    Number.isFinite(updatedAtMs) && nowMs - updatedAtMs! >= 30 * 86_400_000
  );
}
