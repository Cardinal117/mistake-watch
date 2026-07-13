export type MetadataScheduleInput<T> = {
  key: string;
  priority: number;
  run(): Promise<T>;
  signal?: AbortSignal;
};

type MetadataSubscriber<T> = {
  cleanup(): void;
  reject(reason: unknown): void;
  resolve(value: T): void;
};

type MetadataJob<T> = {
  key: string;
  priority: number;
  run(): Promise<T>;
  sequence: number;
  state: "active" | "queued";
  subscribers: Set<MetadataSubscriber<T>>;
};

export class MetadataScheduleAbortError extends Error {
  constructor() {
    super("Metadata request is no longer needed.");
    this.name = "AbortError";
  }
}

export class BoundedMetadataScheduler<T> {
  private activeCount = 0;
  private readonly jobs = new Map<string, MetadataJob<T>>();
  private sequence = 0;

  constructor(private readonly maxConcurrency: number) {
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new Error(
        "Metadata scheduler concurrency must be a positive integer.",
      );
    }
  }

  schedule({ key, priority, run, signal }: MetadataScheduleInput<T>) {
    if (signal?.aborted) {
      return Promise.reject(new MetadataScheduleAbortError());
    }

    let job = this.jobs.get(key);

    if (!job) {
      job = {
        key,
        priority,
        run,
        sequence: this.sequence,
        state: "queued",
        subscribers: new Set(),
      };
      this.sequence += 1;
      this.jobs.set(key, job);
    } else if (job.state === "queued" && priority < job.priority) {
      job.priority = priority;
    }

    return this.subscribe(job, signal);
  }

  getSnapshot() {
    let queuedCount = 0;

    for (const job of this.jobs.values()) {
      if (job.state === "queued") {
        queuedCount += 1;
      }
    }

    return {
      activeCount: this.activeCount,
      jobCount: this.jobs.size,
      queuedCount,
    };
  }

  private subscribe(job: MetadataJob<T>, signal?: AbortSignal) {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const subscriber: MetadataSubscriber<T> = {
        cleanup: () => undefined,
        reject,
        resolve,
      };
      const rejectAsAborted = () => {
        if (settled || !job.subscribers.delete(subscriber)) {
          return;
        }

        settled = true;
        subscriber.cleanup();
        reject(new MetadataScheduleAbortError());

        if (job.state === "queued" && job.subscribers.size === 0) {
          this.jobs.delete(job.key);
        }

        this.pump();
      };

      subscriber.cleanup = () => {
        signal?.removeEventListener("abort", rejectAsAborted);
      };
      subscriber.resolve = (value) => {
        if (settled) {
          return;
        }

        settled = true;
        subscriber.cleanup();
        resolve(value);
      };
      subscriber.reject = (reason) => {
        if (settled) {
          return;
        }

        settled = true;
        subscriber.cleanup();
        reject(reason);
      };

      job.subscribers.add(subscriber);
      signal?.addEventListener("abort", rejectAsAborted, { once: true });
      this.pump();
    });
  }

  private pump() {
    while (this.activeCount < this.maxConcurrency) {
      const nextJob = [...this.jobs.values()]
        .filter((job) => job.state === "queued" && job.subscribers.size > 0)
        .sort(
          (left, right) =>
            left.priority - right.priority || left.sequence - right.sequence,
        )[0];

      if (!nextJob) {
        return;
      }

      nextJob.state = "active";
      this.activeCount += 1;

      void Promise.resolve()
        .then(() => nextJob.run())
        .then(
          (value) => this.settle(nextJob, { status: "resolved", value }),
          (reason: unknown) =>
            this.settle(nextJob, { reason, status: "rejected" }),
        );
    }
  }

  private settle(
    job: MetadataJob<T>,
    result:
      | { status: "resolved"; value: T }
      | { reason: unknown; status: "rejected" },
  ) {
    this.jobs.delete(job.key);
    this.activeCount = Math.max(0, this.activeCount - 1);

    for (const subscriber of job.subscribers) {
      if (result.status === "resolved") {
        subscriber.resolve(result.value);
      } else {
        subscriber.reject(result.reason);
      }
    }

    job.subscribers.clear();
    this.pump();
  }
}

export function isMetadataScheduleAbort(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
