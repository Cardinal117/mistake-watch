import type { RecommendationEventContract } from "./events";

const OUTBOX_MAX_BATCH = 100;

export type RecommendationOutboxTransport = {
  acknowledge(eventIds: string[]): Promise<void>;
  close(): void;
  read(limit: number): Promise<RecommendationEventContract[]>;
};

export async function drainRecommendationEventBatch<
  Event extends { eventId: string; createdMs: bigint } =
    RecommendationEventContract,
>({
  consume,
  limit = 50,
  maxBatches = 1,
  now = Date.now,
  onProgress,
  maxDurationMs = 20_000,
  transport,
}: {
  consume(events: Event[]): Promise<void>;
  limit?: number;
  maxBatches?: number;
  now?: () => number;
  maxDurationMs?: number;
  onProgress?: (progress: {
    status: "empty" | "partial";
    processed: number;
    oldestPendingMs: number | null;
  }) => void;
  transport: {
    acknowledge(eventIds: string[]): Promise<void>;
    close(): void;
    read(limit: number): Promise<Event[]>;
  };
}) {
  const boundedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(OUTBOX_MAX_BATCH, Math.floor(limit)))
    : 100;
  const batches = Number.isFinite(maxBatches)
    ? Math.max(1, Math.min(20, Math.floor(maxBatches)))
    : 1;
  const started = now();
  const duration = Number.isFinite(maxDurationMs)
    ? Math.max(1, Math.min(20_000, maxDurationMs))
    : 20_000;
  const deadline = Date.now() + duration;
  async function withinDeadline<T>(operation: () => Promise<T>): Promise<T> {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw new Error("Recommendation delivery deadline reached");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Recommendation delivery deadline reached")),
            remaining,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  let processed = 0;
  for (
    let batch = 0;
    batch < batches && now() - started < duration && Date.now() < deadline;
    batch++
  ) {
    const events = await withinDeadline(() => transport.read(boundedLimit));
    if (!events.length) {
      onProgress?.({ status: "empty", processed, oldestPendingMs: null });
      return { acknowledged: processed, read: processed };
    }
    onProgress?.({
      status: "partial",
      processed,
      oldestPendingMs: Number(events[0].createdMs),
    });
    await withinDeadline(() => consume(events));
    await withinDeadline(() =>
      transport.acknowledge(events.map((event) => event.eventId)),
    );
    processed += events.length;
    onProgress?.({ status: "partial", processed, oldestPendingMs: null });
  }
  // Peek without acknowledgement: reaching a budget is not evidence of empty.
  if (onProgress && Date.now() < deadline && now() - started < duration) {
    const remaining = await withinDeadline(() => transport.read(1));
    onProgress({
      status: remaining.length ? "partial" : "empty",
      processed,
      oldestPendingMs: remaining.length ? Number(remaining[0].createdMs) : null,
    });
  }
  return { acknowledged: processed, read: processed };
}
