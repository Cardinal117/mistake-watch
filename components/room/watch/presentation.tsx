import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import type { WatchMediaHubItem } from "./contracts";

export function isLiveMediaHubItem(item: WatchMediaHubItem) {
  if (item.isLive || item.sourceType === "hls") {
    return true;
  }

  const url = item.sourceUrl?.toLowerCase() ?? "";
  const title = item.title.toLowerCase();

  return (
    url.includes(".m3u8") ||
    url.includes("/live") ||
    url.includes("livestream") ||
    title.includes(" live ") ||
    title.startsWith("live:")
  );
}

export function deriveUploadTitle(fileName: string) {
  return (
    fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Uploaded video"
  );
}

export function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

export function formatCreditEstimate(credits: number | null | undefined) {
  if (typeof credits !== "number" || !Number.isFinite(credits)) {
    return "Estimated credits unavailable";
  }

  return `~${credits} CloudConvert credit${credits === 1 ? "" : "s"}`;
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

export function parseDurationSeconds(duration: string) {
  const parts = duration.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function getQueueItems(liveRoom: LiveRoomState, room: RoomSnapshot) {
  const participantsById = new Map(
    liveRoom.participants.map((participant) => [participant.id, participant]),
  );

  const liveQueueItems = liveRoom.snapshot.queue.map((item) => ({
    addedBy:
      participantsById.get(item.addedByMemberId)?.name ??
      (item.addedByMemberId ? "Guest" : "Room"),
    artist: item.artist ?? undefined,
    channelName: item.channelName ?? undefined,
    duration:
      typeof item.durationSeconds === "number"
        ? formatDuration(item.durationSeconds)
        : "Metadata pending",
    failureCode: item.failureCode ?? undefined,
    failureCount: item.failureCount || undefined,
    failureCreatedMs: item.failureCreatedMs ?? undefined,
    failureReason: item.failureReason ?? undefined,
    id: item.queueItemId,
    isPinned: item.isPinned,
    isPlayNext: item.isPlayNext,
    isUnavailable: item.isUnavailable,
    playedSequence: item.playedSequence,
    playlistId: item.playlistId ?? undefined,
    playlistTitle: item.playlistTitle ?? undefined,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    status:
      item.status === "playing"
        ? ("now" as const)
        : item.status === "played"
          ? ("played" as const)
          : ("queued" as const),
    thumbnailUrl:
      item.thumbnailUrl ??
      (item.sourceType === "youtube"
        ? (getYouTubeThumbnailUrl(item.sourceUrl) ?? undefined)
        : undefined),
    title: getSourceDisplayTitle({
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      title: item.title,
    }),
    videoId:
      item.sourceType === "youtube"
        ? (parseYouTubeVideoId(item.sourceUrl) ?? undefined)
        : undefined,
  }));

  return liveRoom.connectionStatus === "connected"
    ? liveQueueItems
    : room.queue;
}

export function getMemberAccentColor(memberId: string) {
  const palette = [
    "#00dbe9",
    "#ffba20",
    "#b6c4ff",
    "#7df4ff",
    "#ffdea8",
    "#dce1ff",
  ];
  let hash = 0;

  for (let index = 0; index < memberId.length; index += 1) {
    hash = (hash * 31 + memberId.charCodeAt(index)) % 9973;
  }

  return palette[hash % palette.length];
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function WatchAmbientGlow({
  thumbnailUrl,
}: {
  thumbnailUrl?: string | null;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {thumbnailUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnail is used only as a blurred ambient backdrop, not frame sampling. */}
          <img
            alt=""
            className="absolute inset-[-8%] h-[116%] w-[116%] object-cover opacity-[0.16] blur-3xl saturate-150"
            src={thumbnailUrl}
          />
          <div className="absolute inset-0 bg-background/82" />
        </>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgb(0_219_233_/_0.13),transparent_32rem),radial-gradient(circle_at_80%_72%,rgb(255_186_32_/_0.07),transparent_34rem),linear-gradient(180deg,rgb(10_10_11_/_0.72),rgb(10_10_11_/_0.98))]" />
    </div>
  );
}
