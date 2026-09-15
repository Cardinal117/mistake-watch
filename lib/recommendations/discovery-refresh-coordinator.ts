export interface DiscoveryRefreshCoordinator {
  dispose(): void;
  hasQueued(): boolean;
  invalidate(): Promise<void>;
  request(): Promise<void>;
  setActive(active: boolean): Promise<void>;
  setRun(run: () => Promise<void>): void;
  whenIdle(): Promise<void>;
}

export function createDiscoveryRefreshCoordinator(
  initialRun: () => Promise<void> = async () => undefined,
): DiscoveryRefreshCoordinator {
  let active = false;
  let disposed = false;
  let queued = false;
  let running: Promise<void> | null = null;
  let run = initialRun;

  function start(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (!active) {
      queued = true;
      return Promise.resolve();
    }
    if (running) {
      return running;
    }

    queued = false;
    let operation: Promise<void>;
    try {
      operation = run();
    } catch (error) {
      operation = Promise.reject(error);
    }
    const settled = operation.finally(() => {
      if (running !== settled) return;
      running = null;
      if (queued && active && !disposed) void start().catch(() => undefined);
    });
    running = settled;
    return settled;
  }

  return {
    dispose() {
      disposed = true;
      queued = false;
    },
    hasQueued() {
      return queued;
    },
    invalidate() {
      if (disposed) return Promise.resolve();
      if (!active) {
        queued = true;
        return Promise.resolve();
      }
      if (running) {
        queued = true;
        return running;
      }
      return start();
    },
    request() {
      return start();
    },
    setActive(nextActive) {
      active = nextActive;
      return nextActive && queued ? start() : Promise.resolve();
    },
    setRun(nextRun) {
      run = nextRun;
    },
    async whenIdle() {
      while (running) {
        try {
          await running;
        } catch {
          // request() owns error delivery; this helper only waits for settling.
        }
      }
    },
  };
}
