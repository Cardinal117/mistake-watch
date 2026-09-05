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
