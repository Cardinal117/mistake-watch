import {
  normalizeRecommendationMediaIdentity,
  type RecommendationMediaIdentity,
} from "./media-identity";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_PREFERENCE_FIELDS = [
  "actorMemberId",
  "displayName",
  "email",
  "guestIdentityId",
  "memberId",
  "oauthToken",
  "publicUrl",
  "r2Url",
  "signedUrl",
  "sourceUrl",
  "userId",
];

export type PreferenceMutationInput = RecommendationMediaIdentity & {
  actionId: string;
  expectedRevision: number;
  liked: boolean;
  roomId: string;
};

export function normalizePreferenceMutation(
  payload: unknown,
): PreferenceMutationInput | null {
  if (!isRecord(payload) || containsForbiddenField(payload)) {
    return null;
  }

  const roomId = text(payload.roomId, 80);
  const actionId = text(payload.actionId, 100);
  const identity =
    typeof payload.sourceType === "string" &&
    typeof payload.mediaId === "string"
      ? normalizeRecommendationMediaIdentity({
          mediaId: payload.mediaId,
          sourceType: payload.sourceType,
        })
      : null;

  if (
    !roomId ||
    !UUID_PATTERN.test(roomId) ||
    !actionId ||
    !identity ||
    typeof payload.liked !== "boolean" ||
    !Number.isSafeInteger(payload.expectedRevision) ||
    Number(payload.expectedRevision) < 0 ||
    Number(payload.expectedRevision) > 10_000
  ) {
    return null;
  }

  return {
    ...identity,
    actionId,
    expectedRevision: Number(payload.expectedRevision),
    liked: payload.liked,
    roomId,
  };
}

function containsForbiddenField(value: Record<string, unknown>) {
  return FORBIDDEN_PREFERENCE_FIELDS.some((key) =>
    Object.prototype.hasOwnProperty.call(value, key),
  );
}

function text(value: unknown, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
