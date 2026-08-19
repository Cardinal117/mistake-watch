export type RecommendationRequestKind =
  | "preference-read"
  | "preference-write"
  | "recommendation-read";

export type RequestBudgetState = {
  count: number;
  resetAt: number;
};

export const recommendationRequestLimits: Record<
  RecommendationRequestKind,
  number
> = {
  "preference-read": 60,
  "preference-write": 20,
  "recommendation-read": 30,
};

export function consumeFixedWindowRequest({
  current,
  limit,
  now,
  windowMs,
}: {
  current: RequestBudgetState | null;
  limit: number;
  now: number;
  windowMs: number;
}) {
  const state =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : { ...current };
  const allowed = state.count < limit;

  if (allowed) {
    state.count += 1;
  }

  const ttlMs = Math.max(1, state.resetAt - now);

  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1_000)),
    state,
    ttlMs,
  };
}
