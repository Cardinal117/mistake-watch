export type BoundedCacheLookup<T> = {
  status: "hit" | "miss" | "stale";
  value: T | null;
};

type BoundedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class BoundedTtlCache<T> {
  private readonly entries = new Map<string, BoundedCacheEntry<T>>();

  constructor(
    private readonly defaultTtlMs: number,
    private readonly capacity: number,
    private readonly now: () => number = Date.now,
  ) {
    if (defaultTtlMs <= 0 || capacity <= 0) {
      throw new Error("Cache TTL and capacity must be positive.");
    }
  }

  get(key: string): BoundedCacheLookup<T> {
    const entry = this.entries.get(key);

    if (!entry) {
      return { status: "miss", value: null };
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return { status: "stale", value: null };
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return { status: "hit", value: entry.value };
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs) {
    if (ttlMs <= 0) {
      throw new Error("Cache entry TTL must be positive.");
    }

    this.entries.delete(key);
    this.entries.set(key, {
      expiresAt: this.now() + ttlMs,
      value,
    });
    this.trimToCapacity();
    return value;
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  get size() {
    return this.entries.size;
  }

  private trimToCapacity() {
    while (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      this.entries.delete(oldestKey);
    }
  }
}
