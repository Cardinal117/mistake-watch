export type YouTubePlayerLifecycleLease = {
  release(): void;
};

type YouTubePlayerLifecycleCoordinatorOptions = {
  handoffMs?: number;
  now?: () => number;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

const DEFAULT_HANDOFF_MS = 250;

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

export const youtubePlayerLifecycle = new YouTubePlayerLifecycleCoordinator();

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
