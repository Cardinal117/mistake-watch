export const RUNTIME_ERROR_AUTOSKIP_LIMIT = 3;
export const RUNTIME_ERROR_AUTOSKIP_WINDOW_MS = 30_000;

export function reserveRuntimeErrorAutoSkip(
  timestamps: number[],
  now = Date.now(),
) {
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < RUNTIME_ERROR_AUTOSKIP_WINDOW_MS,
  );

  if (recentTimestamps.length >= RUNTIME_ERROR_AUTOSKIP_LIMIT) {
    return { allowed: false, timestamps: recentTimestamps };
  }

  return {
    allowed: true,
    timestamps: [...recentTimestamps, now],
  };
}
