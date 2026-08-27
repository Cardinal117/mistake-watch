export type YouTubePlayerLifecycleLease = {
  release(): void;
};

type YouTubePlayerLifecycleCoordinatorOptions = {
  handoffMs?: number;
  now?: () => number;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

type YouTubePlayerStartupRecoveryCoordinatorOptions = {
  manualCooldownMs?: number;
  now?: () => number;
};

type YouTubePlayerStartupGuardOptions = {
  timeoutMs?: number;
  schedule?: (callback: () => void, delayMs: number) => number;
  cancel?: (handle: number) => void;
};

type YouTubePlayerLifecycleTeardownOptions = {
  destroy(): void;
  release(): void;
  onDestroyError?(error: unknown): void;
};

const DEFAULT_HANDOFF_MS = 250;
const DEFAULT_MANUAL_RECOVERY_COOLDOWN_MS = 5_000;
export const YOUTUBE_PLAYER_READY_TIMEOUT_MS = 12_000;

export class YouTubePlayerLifecycleCoordinator {
  private readonly handoffMs: number;
  private readonly now: () => number;
  private readonly wait: (
    delayMs: number,
    signal?: AbortSignal,
  ) => Promise<void>;
  private nextAvailableAtMs = 0;
  private tail: Promise<void> = Promise.resolve();

  constructor({
    handoffMs = DEFAULT_HANDOFF_MS,
    now = Date.now,
    wait = waitForDelay,
  }: YouTubePlayerLifecycleCoordinatorOptions = {}) {
    this.handoffMs = Math.max(0, handoffMs);
    this.now = now;
    this.wait = wait;
  }

  async acquire({
    signal,
  }: {
    signal?: AbortSignal;
  } = {}): Promise<YouTubePlayerLifecycleLease> {
    const previousTurn = this.tail;
    let finishTurn = () => {};
    const currentTurn = new Promise<void>((resolve) => {
      finishTurn = resolve;
    });

    this.tail = previousTurn.then(() => currentTurn);

    try {
      await waitForPromise(previousTurn, signal);
      throwIfAborted(signal);

      const handoffDelayMs = Math.max(0, this.nextAvailableAtMs - this.now());

      if (handoffDelayMs > 0) {
        await this.wait(handoffDelayMs, signal);
      }

      throwIfAborted(signal);
    } catch (error) {
      finishTurn();
      throw error;
    }

    let released = false;

    return {
      release: () => {
        if (released) {
          return;
        }

        released = true;
        this.nextAvailableAtMs = this.now() + this.handoffMs;
        finishTurn();
      },
    };
  }
}

export class YouTubePlayerStartupRecoveryCoordinator {
  private readonly manualCooldownMs: number;
  private readonly now: () => number;
  private readonly automaticRecoveryKeys = new Set<string>();
  private readonly manualRecoveryTimes = new Map<string, number>();

  constructor({
    manualCooldownMs = DEFAULT_MANUAL_RECOVERY_COOLDOWN_MS,
    now = Date.now,
  }: YouTubePlayerStartupRecoveryCoordinatorOptions = {}) {
    this.manualCooldownMs = Math.max(0, manualCooldownMs);
    this.now = now;
  }

  reserveAutomatic(recoveryKey: string) {
    if (this.automaticRecoveryKeys.has(recoveryKey)) {
      return false;
    }

    this.automaticRecoveryKeys.add(recoveryKey);
    return true;
  }

  reserveManual(recoveryKey: string) {
    const nowMs = this.now();
    const previousRecoveryAtMs = this.manualRecoveryTimes.get(recoveryKey);

    if (
      previousRecoveryAtMs !== undefined &&
      nowMs - previousRecoveryAtMs < this.manualCooldownMs
    ) {
      return false;
    }

    this.manualRecoveryTimes.set(recoveryKey, nowMs);
    return true;
  }
}

export class YouTubePlayerStartupGuard {
  private readonly timeoutMs: number;
  private readonly schedule: (callback: () => void, delayMs: number) => number;
  private readonly cancel: (handle: number) => void;
  private timeoutHandle: number | null = null;
  private active = false;

  constructor({
    timeoutMs = YOUTUBE_PLAYER_READY_TIMEOUT_MS,
    schedule = (callback, delayMs) => window.setTimeout(callback, delayMs),
    cancel = (handle) => window.clearTimeout(handle),
  }: YouTubePlayerStartupGuardOptions = {}) {
    this.timeoutMs = Math.max(0, timeoutMs);
    this.schedule = schedule;
    this.cancel = cancel;
  }

  arm(onTimeout: () => void) {
    this.dispose();
    this.active = true;
    this.timeoutHandle = this.schedule(() => {
      if (!this.active) {
        return;
      }

      this.active = false;
      this.timeoutHandle = null;
      onTimeout();
    }, this.timeoutMs);
  }

  markReady() {
    this.dispose();
  }

  dispose() {
    this.active = false;

    if (this.timeoutHandle === null) {
      return;
    }

    this.cancel(this.timeoutHandle);
    this.timeoutHandle = null;
  }
}

export function releaseYouTubePlayerLifecycleSafely({
  destroy,
  release,
  onDestroyError,
}: YouTubePlayerLifecycleTeardownOptions) {
  try {
    destroy();
  } catch (error) {
    onDestroyError?.(error);
  } finally {
    release();
  }
}

export const youtubePlayerLifecycle = new YouTubePlayerLifecycleCoordinator();
export const youtubePlayerStartupRecovery =
  new YouTubePlayerStartupRecoveryCoordinator();

function waitForDelay(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal);

    const timer = window.setTimeout(resolve, delayMs);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(createAbortError());
      },
      { once: true },
    );
  });
}

function waitForPromise(promise: Promise<void>, signal?: AbortSignal) {
  if (!signal) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      throwIfAborted(signal);
      signal.addEventListener("abort", () => reject(createAbortError()), {
        once: true,
      });
    }),
  ]);
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function createAbortError() {
  const error = new Error("YouTube player lifecycle acquisition was aborted.");

  error.name = "AbortError";
  return error;
}
