import { getNextQueueItemIdForMode } from "../queue/model";
import { getQueueMetadataPriority } from "../queue/metadata-priority";
import { getYouTubeThumbnailUrl, parseYouTubeVideoId } from "./source";
import type { QueueMode } from "../queue/model";
import type { LiveQueueItem, LiveRoomSnapshot } from "../spacetime/types";
import { loadYouTubeIframeApi } from "../youtube/iframe-api";
import { scheduleQueueYouTubeMetadata } from "../youtube/queue-metadata-scheduler";

export type NextItemPreparationTarget = {
  durationSeconds: number | null;
  queueItemId: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
  thumbnailUrl: string | null;
  title: string;
};

export type NextItemPreparationResult = {
  detail: string;
  durationMs: number;
  status: "failed" | "partial" | "ready" | "skipped";
  target: NextItemPreparationTarget;
};

type PrepareNextItemOptions = {
  signal?: AbortSignal;
};

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

const preparedTargets = new Map<string, NextItemPreparationResult>();
const pendingTargets = new Map<string, Promise<NextItemPreparationResult>>();

export function predictNextQueueItem(snapshot: LiveRoomSnapshot) {
  const session = snapshot.session;
  const queueMode = session?.queueMode ?? "normal";
  const nextQueueItemId = getNextQueueItemIdForMode(
    snapshot.queue.map((item) => ({
      position: item.position,
      queueItemId: item.queueItemId,
      status: item.status,
    })),
    queueMode,
  );

  if (nextQueueItemId) {
    return (
      snapshot.queue.find((item) => item.queueItemId === nextQueueItemId) ??
      null
    );
  }

  return null;
}

export function toNextItemPreparationTarget(
  item: LiveQueueItem | null,
): NextItemPreparationTarget | null {
  if (!item || item.isUnavailable || !item.sourceUrl) {
    return null;
  }

  return {
    durationSeconds: item.durationSeconds,
    queueItemId: item.queueItemId,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    thumbnailUrl:
      item.thumbnailUrl ??
      (item.sourceType === "youtube"
        ? getYouTubeThumbnailUrl(item.sourceUrl)
        : null),
    title: item.title?.trim() || "Next media",
  };
}

export function getNextItemInvalidationKey(snapshot: LiveRoomSnapshot) {
  const session = snapshot.session;
  const queueSignature = snapshot.queue
    .filter(
      (item) =>
        item.status === "playing" ||
        item.status === "queued" ||
        item.status === "played",
    )
    .map(
      (item) =>
        `${item.queueItemId}:${item.status}:${item.position}:${item.sourceUrl}`,
    )
    .join("|");

  return [
    session?.activeQueueItemId ?? "none",
    session?.queueMode ?? ("normal" satisfies QueueMode),
    queueSignature,
  ].join("::");
}

export function getNextItemPreparationCacheKey(
  target: NextItemPreparationTarget,
) {
  return `${target.queueItemId}:${target.sourceType}:${target.sourceUrl}`;
}

export async function prepareNextItem(
  target: NextItemPreparationTarget,
  options: PrepareNextItemOptions = {},
): Promise<NextItemPreparationResult> {
  const cacheKey = getNextItemPreparationCacheKey(target);
  const cached = preparedTargets.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = pendingTargets.get(cacheKey);

  if (pending) {
    return pending;
  }

  const request = prepareNextItemUncached(target, options).finally(() => {
    pendingTargets.delete(cacheKey);
  });

  pendingTargets.set(cacheKey, request);

  return request;
}

async function prepareNextItemUncached(
  target: NextItemPreparationTarget,
  { signal }: PrepareNextItemOptions,
) {
  const startMs = performance.now();
  const markName = `mw-next-item-prepare-${target.queueItemId}`;

  performance.mark?.(`${markName}-start`);

  const skippedReason = getNetworkSkipReason();
  let result: NextItemPreparationResult;

  if (skippedReason) {
    result = createResult(target, startMs, "skipped", skippedReason);
  } else if (target.sourceType === "youtube") {
    result = await prepareYouTubeNextItem(target, startMs, signal);
  } else if (target.sourceType === "hls") {
    result = await prepareHlsNextItem(target, startMs, signal);
  } else {
    result = await prepareDirectNextItem(target, startMs, signal);
  }

  preparedTargets.set(getNextItemPreparationCacheKey(target), result);
  performance.mark?.(`${markName}-end`);

  try {
    performance.measure?.(
      "mw-next-item-preparation",
      `${markName}-start`,
      `${markName}-end`,
    );
  } catch {
    // Performance marks are diagnostic only.
  }

  dispatchPreparationTiming(result);

  return result;
}

async function prepareYouTubeNextItem(
  target: NextItemPreparationTarget,
  startMs: number,
  signal?: AbortSignal,
) {
  const videoId = parseYouTubeVideoId(target.sourceUrl);

  if (!videoId) {
    return createResult(target, startMs, "failed", "Invalid YouTube source.");
  }

  const tasks = [
    preloadImage(target.thumbnailUrl, signal),
    preloadYouTubeMetadata(videoId, signal),
    loadYouTubeIframeApi(),
  ];
  const results = await Promise.allSettled(tasks);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length === 0) {
    return createResult(
      target,
      startMs,
      "ready",
      "YouTube metadata, thumbnail, and iframe API are ready.",
    );
  }

  if (failed.length < results.length) {
    return createResult(
      target,
      startMs,
      "partial",
      "Some YouTube readiness work completed.",
    );
  }

  return createResult(
    target,
    startMs,
    "failed",
    "YouTube readiness could not complete.",
  );
}

async function prepareDirectNextItem(
  target: NextItemPreparationTarget,
  startMs: number,
  signal?: AbortSignal,
) {
  const results = await Promise.allSettled([
    preloadImage(target.thumbnailUrl, signal),
    preloadMediaMetadata(target.sourceUrl, "direct", signal),
  ]);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length === 0) {
    return createResult(
      target,
      startMs,
      "ready",
      "Direct media metadata is ready.",
    );
  }

  if (failed.length < results.length) {
    return createResult(
      target,
      startMs,
      "partial",
      "Some direct media readiness work completed.",
    );
  }

  return createResult(
    target,
    startMs,
    "failed",
    "Direct media metadata could not be prepared.",
  );
}

async function prepareHlsNextItem(
  target: NextItemPreparationTarget,
  startMs: number,
  signal?: AbortSignal,
) {
  const nativeHlsProbe =
    typeof document !== "undefined" &&
    document
      .createElement("video")
      .canPlayType("application/vnd.apple.mpegurl");
  const hlsTask = nativeHlsProbe
    ? preloadMediaMetadata(target.sourceUrl, "hls", signal)
    : warmHlsManifest(target.sourceUrl, signal);
  const results = await Promise.allSettled([
    preloadImage(target.thumbnailUrl, signal),
    hlsTask,
  ]);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length === 0) {
    return createResult(target, startMs, "ready", "HLS manifest is warm.");
  }

  if (failed.length < results.length) {
    return createResult(
      target,
      startMs,
      "partial",
      "Some HLS readiness work completed.",
    );
  }

  return createResult(
    target,
    startMs,
    "failed",
    "HLS readiness could not complete.",
  );
}

function preloadImage(src: string | null, signal?: AbortSignal) {
  if (!src || typeof Image === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Preload aborted.", "AbortError"));
      return;
    }

    const image = new Image();
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Preload aborted.", "AbortError"));
    };

    image.decoding = "async";
    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Image preload failed."));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    image.src = src;
  });
}

function preloadMediaMetadata(
  sourceUrl: string,
  sourceType: "direct" | "hls",
  signal?: AbortSignal,
) {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Preload aborted.", "AbortError"));
      return;
    }

    const media = document.createElement(isLikelyAudioUrl(sourceUrl) ? "audio" : "video");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${sourceType} metadata preload timed out.`));
    }, 8_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", handleAbort);
      media.removeAttribute("src");
      media.load();
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Preload aborted.", "AbortError"));
    };

    media.preload = "metadata";
    media.crossOrigin = "anonymous";
    media.onloadedmetadata = finish;
    media.oncanplay = finish;
    media.onerror = () => {
      cleanup();
      reject(new Error(`${sourceType} metadata preload failed.`));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    media.src = sourceUrl;
    media.load();
  });
}

async function warmHlsManifest(sourceUrl: string, signal?: AbortSignal) {
  const response = await fetch(sourceUrl, {
    method: "HEAD",
    signal,
  });

  if (!response.ok) {
    throw new Error("HLS manifest warmup failed.");
  }
}

async function preloadYouTubeMetadata(videoId: string, signal?: AbortSignal) {
  await scheduleQueueYouTubeMetadata(videoId, {
    priority: getQueueMetadataPriority({
      itemIndex: 0,
      queuedIndex: 0,
    }),
    signal,
  });
}

function getNetworkSkipReason() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const connection = (navigator as Navigator & {
    connection?: NavigatorConnection;
  }).connection;

  if (connection?.saveData) {
    return "Skipped because the browser reports data saver mode.";
  }

  if (
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g"
  ) {
    return "Skipped because the network is constrained.";
  }

  return null;
}

function createResult(
  target: NextItemPreparationTarget,
  startMs: number,
  status: NextItemPreparationResult["status"],
  detail: string,
): NextItemPreparationResult {
  return {
    detail,
    durationMs: Math.round(performance.now() - startMs),
    status,
    target,
  };
}

function dispatchPreparationTiming(result: NextItemPreparationResult) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("mw:next-item-preparation", {
      detail: result,
    }),
  );
}

function isLikelyAudioUrl(input: string) {
  try {
    const extension = new URL(input).pathname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

    return Boolean(
      extension &&
        [".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav"].includes(
          extension,
        ),
    );
  } catch {
    return false;
  }
}
