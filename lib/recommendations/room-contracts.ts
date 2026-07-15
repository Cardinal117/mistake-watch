import {
  normalizeRecommendationMediaIdentity,
  type RecommendationMediaIdentity,
} from "./media-identity";
import type { RecommendationCandidate, RecommendationReason } from "./scoring";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_REQUEST_FIELDS = new Set([
  "actorMemberId",
  "contributorMemberId",
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
]);
const MAX_CANDIDATES = 160;
const MAX_CONTEXT_ITEMS = 320;

export type RoomRecommendationCandidate = RecommendationCandidate;

export type RoomRecommendationRequest = {
  candidates: RoomRecommendationCandidate[];
  currentMedia?: RecommendationMediaIdentity & {
    artist?: string;
    channelName?: string;
    playlistId?: string;
  };
  limit: number;
  queuedMedia: RecommendationMediaIdentity[];
  recentHistory: RecommendationMediaIdentity[];
  revision: string;
  roomId: string;
};

export type RoomRecommendationItem = {
  artist?: string;
  candidateId: string;
  channelName?: string;
  mediaId: string;
  mediaKey: string;
  playlistId?: string;
  reasons: RecommendationReason[];
  sourceType: RecommendationMediaIdentity["sourceType"];
  title: string;
};

export type RoomRecommendationResponse = {
  cache: "hit" | "miss";
  items: RoomRecommendationItem[];
  reason?: string;
  source: "first-party" | "fallback";
  status: "available" | "unavailable";
};

export function normalizeRoomRecommendationRequest(
  payload: unknown,
): RoomRecommendationRequest | null {
  if (!isRecord(payload) || containsForbiddenField(payload)) {
    return null;
  }

  const roomId = boundedText(payload.roomId, 80);
  const revision = boundedText(payload.revision, 120);
  const candidates = normalizeCandidates(payload.candidates);
  const currentMedia = normalizeContextMedia(payload.currentMedia);
  const queuedMedia = normalizeMediaList(payload.queuedMedia);
  const recentHistory = normalizeMediaList(payload.recentHistory);

  if (
    !roomId ||
    !UUID_PATTERN.test(roomId) ||
    !revision ||
    candidates === null ||
    queuedMedia === null ||
    recentHistory === null ||
    (payload.currentMedia !== undefined && !currentMedia)
  ) {
    return null;
  }

  return {
    candidates,
    currentMedia: currentMedia ?? undefined,
    limit: normalizeLimit(payload.limit),
    queuedMedia,
    recentHistory,
    revision,
    roomId,
  };
}

function normalizeCandidates(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_CANDIDATES) {
    return null;
  }

  const candidates: RoomRecommendationCandidate[] = [];

  for (const valueCandidate of value) {
    if (!isRecord(valueCandidate)) {
      return null;
    }

    const identity = normalizeIdentity(valueCandidate);
    const candidateId = boundedText(valueCandidate.candidateId, 160);
    const title = boundedText(valueCandidate.title, 300);

    if (!identity || !candidateId || !title) {
      return null;
    }

    candidates.push({
      ...identity,
      artist: optionalText(valueCandidate.artist, 160),
      candidateId,
      channelName: optionalText(valueCandidate.channelName, 160),
      isAvailable: optionalBoolean(valueCandidate.isAvailable),
      playlistId: optionalText(valueCandidate.playlistId, 160),
      publishedAtMs: optionalNonnegativeInteger(valueCandidate.publishedAtMs),
      title,
    });
  }

  return candidates;
}

function normalizeContextMedia(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const identity = normalizeIdentity(value);

  if (!identity) {
    return null;
  }

  return {
    ...identity,
    artist: optionalText(value.artist, 160),
    channelName: optionalText(value.channelName, 160),
    playlistId: optionalText(value.playlistId, 160),
  };
}

function normalizeMediaList(value: unknown) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_CONTEXT_ITEMS) {
    return null;
  }

  const media: RecommendationMediaIdentity[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const identity = normalizeIdentity(item);

    if (!identity) {
      return null;
    }

    media.push(identity);
  }

  return media;
}

function normalizeIdentity(value: Record<string, unknown>) {
  if (
    typeof value.mediaId !== "string" ||
    typeof value.sourceType !== "string"
  ) {
    return null;
  }

  return normalizeRecommendationMediaIdentity({
    mediaId: value.mediaId,
    sourceType: value.sourceType,
  });
}

function containsForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenField);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_REQUEST_FIELDS.has(key) || containsForbiddenField(nested),
  );
}

function normalizeLimit(value: unknown) {
  return Number.isSafeInteger(value)
    ? Math.max(0, Math.min(Number(value), 20))
    : 8;
}

function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function optionalText(value: unknown, maxLength: number) {
  return value === undefined
    ? undefined
    : (boundedText(value, maxLength) ?? undefined);
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function optionalNonnegativeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
