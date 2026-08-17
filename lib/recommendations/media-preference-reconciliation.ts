import type { ClientMediaPreference } from "./room-client";

export type MediaPreferenceMap = Record<string, ClientMediaPreference>;

export function indexMediaPreferences(
  items: ClientMediaPreference[],
): MediaPreferenceMap {
  return Object.fromEntries(items.map((item) => [item.mediaKey, item]));
}

export function reconcileMediaPreferences({
  current,
  incoming,
  pendingKeys,
}: {
  current: MediaPreferenceMap;
  incoming: MediaPreferenceMap;
  pendingKeys: ReadonlySet<string>;
}) {
  const next = { ...incoming };

  for (const key of pendingKeys) {
    if (current[key]) {
      next[key] = current[key];
    }
  }

  return mediaPreferenceMapsEqual(current, next)
    ? { changed: false, preferences: current }
    : { changed: true, preferences: next };
}

export function shouldApplyPreferenceSnapshot({
  currentMutationGeneration,
  currentRoomId,
  latestRequestSequence,
  requestMutationGeneration,
  requestRoomId,
  requestSequence,
}: {
  currentMutationGeneration: number;
  currentRoomId: string;
  latestRequestSequence: number;
  requestMutationGeneration: number;
  requestRoomId: string;
  requestSequence: number;
}) {
  return (
    requestRoomId === currentRoomId &&
    requestSequence === latestRequestSequence &&
    requestMutationGeneration === currentMutationGeneration
  );
}

function mediaPreferenceMapsEqual(
  left: MediaPreferenceMap,
  right: MediaPreferenceMap,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftPreference = left[key];
    const rightPreference = right[key];

    return (
      rightPreference !== undefined &&
      leftPreference.liked === rightPreference.liked &&
      leftPreference.mediaId === rightPreference.mediaId &&
      leftPreference.mediaKey === rightPreference.mediaKey &&
      leftPreference.revision === rightPreference.revision &&
      leftPreference.sourceType === rightPreference.sourceType
    );
  });
}
