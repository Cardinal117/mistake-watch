export const DISCOVER_COUNT_WINDOW_DAYS = 180;
export const DISCOVER_SNOOZE_DAYS = 7;
export const discoverFeedbackStates = [
  "neutral",
  "not_now",
  "do_not_suggest",
  "wrong_version",
] as const;
export type DiscoverFeedbackState = (typeof discoverFeedbackStates)[number];
export type DiscoverSurface = "regulars" | "recommended" | "rediscover";
export type DiscoverFeedback = {
  mediaId: string;
  state: DiscoverFeedbackState;
  revision: number;
  expiresAt: string | null;
};
export type DiscoverItem = {
  mediaId: string;
  sourceType: "youtube";
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  completedPlayCount: number;
  lastCompletedAt: string | null;
  liked: boolean;
};
export type DiscoverMutation = {
  roomId: string;
  mediaId: string;
  actionId: string;
  kind:
    | "shown"
    | "add_requested"
    | "queue_observed"
    | "play_requested"
    | "play_next_requested"
    | "feedback";
  surface: DiscoverSurface;
  state?: DiscoverFeedbackState;
  expectedRevision?: number;
};
export type DiscoverResponse = {
  status: "available";
  items: DiscoverItem[];
  feedback: DiscoverFeedback[];
  countWindowDays: number;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIA = /^[A-Za-z0-9_-]{6,64}$/;
const KINDS = new Set([
  "shown",
  "add_requested",
  "queue_observed",
  "play_requested",
  "play_next_requested",
  "feedback",
]);
const SURFACES = new Set(["regulars", "recommended", "rediscover"]);
const FIELDS = new Set([
  "roomId",
  "mediaId",
  "actionId",
  "kind",
  "surface",
  "state",
  "expectedRevision",
]);

export function normalizeDiscoverRoomId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function normalizeDiscoverMutation(
  value: unknown,
): DiscoverMutation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some((key) => !FIELDS.has(key)) ||
    !normalizeDiscoverRoomId(input.roomId) ||
    typeof input.mediaId !== "string" ||
    !MEDIA.test(input.mediaId) ||
    typeof input.actionId !== "string" ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(input.actionId) ||
    typeof input.kind !== "string" ||
    !KINDS.has(input.kind) ||
    typeof input.surface !== "string" ||
    !SURFACES.has(input.surface)
  )
    return null;
  if (input.kind === "feedback") {
    if (
      !discoverFeedbackStates.includes(input.state as DiscoverFeedbackState) ||
      typeof input.expectedRevision !== "number" ||
      !Number.isSafeInteger(input.expectedRevision) ||
      input.expectedRevision < 0
    )
      return null;
  } else if ("state" in input || "expectedRevision" in input) return null;
  return input as DiscoverMutation;
}

export function isDiscoverSuppressed(
  feedback: Pick<DiscoverFeedback, "state" | "expiresAt">,
  now = Date.now(),
) {
  return (
    feedback.state === "do_not_suggest" ||
    feedback.state === "wrong_version" ||
    (feedback.state === "not_now" &&
      feedback.expiresAt !== null &&
      Date.parse(feedback.expiresAt) > now)
  );
}
