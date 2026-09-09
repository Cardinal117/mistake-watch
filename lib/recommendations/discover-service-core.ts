import {
  DISCOVER_COUNT_WINDOW_DAYS,
  discoverFeedbackStates,
  type DiscoverFeedback,
  type DiscoverItem,
  type DiscoverResponse,
} from "./discover-contracts";
import type { YouTubeMetadataResponse } from "../youtube/metadata";

type ProjectionItem = Omit<
  DiscoverItem,
  "title" | "artist" | "thumbnailUrl" | "durationSeconds"
>;
export type DiscoverProjection = {
  items: ProjectionItem[];
  feedback: DiscoverFeedback[];
  countWindowDays: number;
};
const MEDIA = /^[A-Za-z0-9_-]{6,64}$/;

export function createPersonalDiscoverReader(
  read: () => Promise<unknown>,
  metadata: (mediaId: string) => Promise<YouTubeMetadataResponse>,
) {
  return async (): Promise<DiscoverResponse> => {
    const projection = parseDiscoverProjection(await read());
    const items: DiscoverItem[] = [];
    for (let offset = 0; offset < projection.items.length; offset += 8) {
      const batch = await Promise.all(
        projection.items.slice(offset, offset + 8).map(async (item) => {
          const response = await metadata(item.mediaId).catch(() => null);
          if (response?.availability.playable === false) return null;
          const known = response?.metadata;
          return {
            ...item,
            title: known?.title || "Title unavailable",
            ...(known?.channelTitle ? { artist: known.channelTitle } : {}),
            thumbnailUrl:
              known?.thumbnailUrl ||
              `https://i.ytimg.com/vi/${item.mediaId}/hqdefault.jpg`,
            ...(known?.durationSeconds
              ? { durationSeconds: known.durationSeconds }
              : {}),
          } satisfies DiscoverItem;
        }),
      );
      for (const item of batch) if (item) items.push(item);
    }
    return { ...projection, items, status: "available" };
  };
}

export function parseDiscoverProjection(value: unknown): DiscoverProjection {
  const input = object(value);
  if (
    !input ||
    input.countWindowDays !== DISCOVER_COUNT_WINDOW_DAYS ||
    !Array.isArray(input.items) ||
    input.items.length > 24 ||
    !Array.isArray(input.feedback) ||
    input.feedback.length > 1000
  )
    throw new Error("Invalid Discover projection");
  const items = input.items.map((value) => {
    const row = object(value);
    if (
      !row ||
      !keysOnly(row, [
        "mediaId",
        "sourceType",
        "completedPlayCount",
        "lastCompletedAt",
        "liked",
      ]) ||
      typeof row.mediaId !== "string" ||
      !MEDIA.test(row.mediaId) ||
      row.sourceType !== "youtube" ||
      typeof row.liked !== "boolean" ||
      !nonnegativeInteger(row.completedPlayCount) ||
      !nullableDate(row.lastCompletedAt)
    )
      throw new Error("Invalid Discover item");
    return row as ProjectionItem;
  });
  const feedback = input.feedback.map(parseDiscoverFeedback);
  return { items, feedback, countWindowDays: DISCOVER_COUNT_WINDOW_DAYS };
}

export function parseDiscoverFeedback(value: unknown): DiscoverFeedback {
  const row = object(value);
  if (
    !row ||
    !keysOnly(row, ["mediaId", "state", "revision", "expiresAt"]) ||
    typeof row.mediaId !== "string" ||
    !MEDIA.test(row.mediaId) ||
    !discoverFeedbackStates.includes(row.state as DiscoverFeedback["state"]) ||
    !nonnegativeInteger(row.revision) ||
    !nullableDate(row.expiresAt)
  )
    throw new Error("Invalid Discover feedback");
  return row as DiscoverFeedback;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function keysOnly(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}
function nonnegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function nullableDate(value: unknown) {
  return (
    value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}
