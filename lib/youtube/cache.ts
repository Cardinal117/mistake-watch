export type CacheLookupStatus = "hit" | "miss" | "stale";

export type CacheLookup<T> = {
  status: CacheLookupStatus;
  value: T | null;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): CacheLookup<T> {
    const entry = this.entries.get(key);

    if (!entry) {
      return {
        status: "miss",
        value: null,
      };
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);

      return {
        status: "stale",
        value: null,
      };
    }

    return {
      status: "hit",
      value: entry.value,
    };
  }

  set(key: string, value: T) {
    this.entries.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value,
    });

    return value;
  }
}

export class InFlightRequestCache<T> {
  private readonly requests = new Map<string, Promise<T>>();

  getOrCreate(key: string, createRequest: () => Promise<T>) {
    const existing = this.requests.get(key);

    if (existing) {
      return existing;
    }

    const request = createRequest().finally(() => {
      this.requests.delete(key);
    });

    this.requests.set(key, request);

    return request;
  }
}
