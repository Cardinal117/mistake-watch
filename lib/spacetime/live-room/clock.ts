/** Read a fresh reducer-result clock sample, never a historical row timestamp. */
export function readReducerClockOffset(
  context: unknown,
  clientReceivedMs: number,
): number | null {
  const event = (
    context as {
      event?: {
        tag?: unknown;
        value?: { timestamp?: { microsSinceUnixEpoch?: unknown } };
      };
    } | null
  )?.event;
  const micros =
    event?.tag === "Reducer"
      ? event.value?.timestamp?.microsSinceUnixEpoch
      : undefined;

  if (typeof micros !== "bigint" || !Number.isSafeInteger(clientReceivedMs)) {
    return null;
  }

  const serverMs = Number(micros / BigInt(1_000));
  const offsetMs = clientReceivedMs - serverMs;

  // Like any one-way sample, this includes response transit time. Subscription
  // age is not transit time: SubscribeApplied/Transaction have no clock sample.
  return Number.isSafeInteger(serverMs) && Number.isSafeInteger(offsetMs)
    ? offsetMs
    : null;
}

/** Lowest-delay arrival estimate with bounded convergence. One-way samples do
 * not measure network asymmetry; a delayed packet cannot abruptly rewind time. */
export class StableClockOffset {
  private offset: number | null = null;
  private buckets = new Map<number, number>();
  private lastAt = 0;

  sample(offset: number, now: number) {
    if (this.offset === null) {
      this.offset = offset;
      this.lastAt = now;
    }
    // Keep one minimum per five-second bucket, expiring after a minute. An
    // ancient minimum must not pin the estimate after a device clock change.
    const bucket = Math.floor(now / 5000);
    this.buckets.set(
      bucket,
      Math.min(this.buckets.get(bucket) ?? Infinity, offset),
    );
    for (const key of this.buckets.keys()) {
      if (key < bucket - 12 || key > bucket) this.buckets.delete(key);
    }
    const best = Math.min(...this.buckets.values());
    const step = Math.min(100, Math.max(0, now - this.lastAt) * 0.02);
    this.offset += Math.max(-step, Math.min(step, best - this.offset));
    this.lastAt = now;
    return this.offset;
  }
}

/** Midpoint estimate for our uniquely identified join request. Server processing
 * and asymmetric transport still contribute uncertainty; no other member's
 * reducer is treated as our round trip. */
export function readJoinClockOffset(
  context: unknown,
  pending: { admissionId: string; sentAt: number } | null,
  receivedAt: number,
) {
  const reducer = (
    context as {
      event?: {
        value?: {
          reducer?: {
            name?: string;
            args?: { admissionId?: string; admission_id?: string };
          };
        };
      };
    } | null
  )?.event?.value?.reducer;
  if (
    !pending ||
    !["join_room", "joinRoom"].includes(reducer?.name ?? "") ||
    (reducer?.args?.admissionId ?? reducer?.args?.admission_id) !==
      pending.admissionId ||
    receivedAt < pending.sentAt ||
    receivedAt - pending.sentAt > 5000
  )
    return null;
  const offset = readReducerClockOffset(context, receivedAt);
  return offset === null ? null : offset - (receivedAt - pending.sentAt) / 2;
}
