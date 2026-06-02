"use client";

const TRANSITION_KEY = "mw_room_transition_start";

type TransitionStart = {
  label: string;
  path: string;
  startedAt: number;
};

export function markRoomTransition(label: string) {
  if (typeof window === "undefined" || !window.performance) {
    return;
  }

  const payload: TransitionStart = {
    label,
    path: window.location.pathname,
    startedAt: performance.now(),
  };

  window.sessionStorage.setItem(TRANSITION_KEY, JSON.stringify(payload));
  performance.mark(`mistake-watch:${label}:start`);
}

export function completeRoomTransition(label: string) {
  if (typeof window === "undefined" || !window.performance) {
    return;
  }

  const raw = window.sessionStorage.getItem(TRANSITION_KEY);

  if (!raw) {
    return;
  }

  try {
    const payload = JSON.parse(raw) as TransitionStart;
    const durationMs = Math.max(0, performance.now() - payload.startedAt);

    performance.measure(`mistake-watch:${payload.label}:complete`, {
      duration: durationMs,
      start: performance.timeOrigin + payload.startedAt,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[Mistake Watch]", `${label} ready`, {
        durationMs: Math.round(durationMs),
        from: payload.path,
        transition: payload.label,
      });
    }
  } catch {
    // Ignore malformed sessionStorage values from older builds.
  } finally {
    window.sessionStorage.removeItem(TRANSITION_KEY);
  }
}
