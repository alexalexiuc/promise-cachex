export type CachedItem<T = any> = {
  key: string;
  promise: Promise<T>;
  expiresAt: number;
};

type Cache<T = any> = Map<string, CachedItem<T>>;

export type CacheOptions = {
  /**
   * Default TTL in milliseconds for cached items.
   * If not set, defaults to 1 hour.
   * 0 TTL will cache indefinitely.
   */
  ttl?: number;
  /**
   * Interval for running housekeeping.
   * Defaults to 5 minutes.
   */
  cleanupInterval?: number;
};

type ItemOptions = {
  /**
   * TTL in milliseconds for the cached item.
   * If not set, defaults to the cache's TTL.
   * 0 TTL will cache indefinitely.
   */
  ttl?: number;
};

const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour
const DEFAULT_TTL_VERIFICATION = 1000 * 60 * 5; // 5 minutes

/**
 * A cache that stores promises and their results.
 *
 * The cache will automatically remove expired items, at a given interval.
 */
export class PromiseCacheX {
  private cache: Cache = new Map();
  private ttl: number;
  private cleanupInterval: number;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl || DEFAULT_TTL;
    this.cleanupInterval = options?.cleanupInterval || DEFAULT_TTL_VERIFICATION;

    // run housekeeping every 5 minutes
    setInterval(() => this._housekeeping(), this.cleanupInterval);
  }

  /**
   * If a promise by given key exists, it will be returned, otherwise it will be cached and returned.
   * Note that if a promise will error, error will be returned and cache will be deleted.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: ItemOptions
  ): Promise<T> {
    const now = Date.now();

    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (item.expiresAt > now) {
        return this._handlePromise(key, item.promise);
      }
      // if cached is expired, remove it
      this._delete(key);
    }
    const expiresAt =
      (options?.ttl ?? this.ttl) === 0
        ? +Infinity
        : now + (options?.ttl || this.ttl);
    const promise = fetcher();
    this.cache.set(key, {
      key,
      promise,
      expiresAt,
    });
    return this._handlePromise(key, promise);
  }

  /**
   * Deletes a cached item by key.
   */
  delete(key: string): void {
    this._delete(key);
  }

  /**
   * Clears the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the number of items in the cache.
   * This includes both expired and non-expired items.
   * Expired items are removed at a regular interval.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Returns all keys in the cache.
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private async _handlePromise<T>(key: string, promise: Promise<T>) {
    try {
      return await promise;
    } catch (error) {
      this._delete(key);
      throw error;
    }
  }

  private _delete(key: string): void {
    this.cache.delete(key);
  }

  private _housekeeping() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expiresAt <= now) {
        this._delete(key);
      }
    }
  }
}
