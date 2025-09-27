export type CachedItem<T = unknown> = {
  key: string;
  promise: Promise<T> | T;
  expiresAt: number;
};

type Cache<T = unknown> = Map<string, CachedItem<T>>;

type FetchOrPromise<T> = (() => Promise<T> | T) | Promise<T> | T;

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
   * 0 no cleanup will be run.
   * Note that this is not the TTL of the items, but the interval for checking expired items.
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
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl ?? DEFAULT_TTL;
    this.cleanupInterval = options?.cleanupInterval ?? DEFAULT_TTL_VERIFICATION;
  }

  /**
   * Receives a key and a fetcher function or a promise.
   * If the key is not in the cache, it will fetch the value and cache it.
   *
   * Function can also work with non-promise values.
   *
   * Note that if a promise will error, error will be returned and cache will be deleted.
   */
  async get<T>(
    key: string,
    fetcherOrPromise: FetchOrPromise<T>,
    options?: ItemOptions
  ): Promise<T> {
    const now = Date.now();

    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (item.expiresAt > now) {
        return this._handlePromise(key, item.promise as T);
      }
    }
    
    const promise = this._fetchValue(fetcherOrPromise);

    this._set(key, promise, options);

    return this._handlePromise(key, promise);
  }

  /**
   * Deletes a cached item by key.
   */
  delete(key: string): void {
    this._delete(key);
    // Check if cleanup should be stopped
    this._stopCleanupIfNeeded();
  }

  /**
   * Clears the cache.
   */
  clear(): void {
    this.cache.clear();
    // Try stop cleanup
    this._stopCleanupIfNeeded();
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

  /**
   * Returns true if the key is in the cache.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  set<T>(key: string, value: Promise<T> | T, options?: ItemOptions): void {
    this._set(key, value, options);
  }

  private async _set(key: string, value: Promise<unknown> | unknown, options?: ItemOptions) {
    const now = Date.now();
    const expiresAt =
      (options?.ttl ?? this.ttl) === 0
        ? +Infinity
        : now + (options?.ttl || this.ttl);
    this.cache.set(key, {
      key,
      promise: value,
      expiresAt,
    });
    // Ensure cleanup is running when a new item is added
    this._startCleanup();
  }

  private async _handlePromise<T>(key: string, promise: Promise<T> | T) {
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

  private _startCleanup(): void {
    if (!this.cleanupTimer && this.cleanupInterval !== 0) {
      this.cleanupTimer = setInterval(() => {
        this._housekeeping();
        // Stop cleanup if cache is empty
        this._stopCleanupIfNeeded();
      }, this.cleanupInterval);
    }
  }

  private _stopCleanupIfNeeded(): void {
    if (this.cache.size === 0 && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private _housekeeping() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expiresAt <= now) {
        this._delete(key);
      }
    }
  }

  private _fetchValue<T>(fetcherOrPromise: FetchOrPromise<T>): Promise<T> | T {
    // Wrap in Promise.resolve to ensure consistent behavior
    return Promise.resolve(
      typeof fetcherOrPromise === "function"
        ? (fetcherOrPromise as () => Promise<T> | T)()
        : fetcherOrPromise
    );
  }
}
