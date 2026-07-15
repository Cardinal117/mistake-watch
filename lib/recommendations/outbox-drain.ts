import type { RecommendationEventContract } from "./events";

const OUTBOX_MAX_BATCH = 100;

export type RecommendationOutboxTransport = {
  acknowledge(eventIds: string[]): Promise<void>;
  close(): void;
  read(limit: number): Promise<RecommendationEventContract[]>;
};

export async function drainRecommendationEventBatch({
  consume,
  limit = 50,
  transport,
}: {
  consume(events: RecommendationEventContract[]): Promise<void>;
  limit?: number;
  transport: RecommendationOutboxTransport;
}) {
  const boundedLimit = Math.max(1, Math.min(OUTBOX_MAX_BATCH, limit));
  const events = await transport.read(boundedLimit);

  if (events.length === 0) {
    return { acknowledged: 0, read: 0 };
  }

  await consume(events);
  await transport.acknowledge(events.map((event) => event.eventId));

  return { acknowledged: events.length, read: events.length };
}
