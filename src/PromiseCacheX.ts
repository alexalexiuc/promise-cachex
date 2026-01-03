type LooseIfUnknown<T> = unknown extends T ? any : T;

export type CachedItem<T = unknown> = {
  key: string;
  promise: Promise<T> | T;
  expiresAt: number;
  isResolved: boolean;
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
  /**
   * Maximum number of entries in the cache.
   * When the limit is reached, the least recently used entry is evicted.
   * Entries with pending (unresolved) promises are protected from eviction.
   * If not set, the cache is unbounded.
   */
  maxEntries?: number;
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
 * Generic promise/value cache.
 * 
 * The cache will automatically remove expired items, at a given interval.
 * 
 * Typescript generics:
 * If you instantiate without a type arg (PromiseCacheX<>), value type is "loose" (any).
 * If you instantiate with a type (e.g. PromiseCacheX<number>), all values are restricted to that type.
 */
export class PromiseCacheX<T = unknown> {
  private cache: Cache<LooseIfUnknown<T>> = new Map();
  private ttl: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private maxEntries: number | undefined;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl ?? DEFAULT_TTL;
    this.cleanupInterval = options?.cleanupInterval ?? DEFAULT_TTL_VERIFICATION;
    this.maxEntries = options?.maxEntries;
  }

  /**
   * Receives a key and a fetcher function or a promise.
   * If the key is not in the cache, it will fetch the value and cache it.
   *
   * Function can also work with non-promise values.
   *
   * Note that if a promise will error, error will be returned and cache will be deleted.
   */
  async get<U extends LooseIfUnknown<T> = LooseIfUnknown<T>>(
    key: string,
    fetcherOrPromise: FetchOrPromise<U>,
    options?: ItemOptions
  ): Promise<U> {
    const now = Date.now();

    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      if (item.expiresAt > now) {
        // Move to end of Map for LRU tracking (most recently used)
        this._moveToEnd(key, item);
        return this._handlePromise<U>(key, item.promise as Promise<U> | U);
      }
    }

    const promise = this._fetchValue<U>(fetcherOrPromise);
    this._set<U>(key, promise, options);
    return this._handlePromise<U>(key, promise);
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

  /**
   * Returns the maximum entries limit, or undefined if unbounded.
   */
  getMaxEntries(): number | undefined {
    return this.maxEntries;
  }

  /**
   * Returns true if the cache is at or over capacity.
   * Always returns false if maxEntries is not set.
   */
  isAtCapacity(): boolean {
    return this.maxEntries !== undefined && this.cache.size >= this.maxEntries;
  }

  set<U extends LooseIfUnknown<T>>(
    key: string,
    value: Promise<U> | U,
    options?: ItemOptions
  ): void {
    this._set<U>(key, value, options);
  }

  private _set<U extends LooseIfUnknown<T>>(
    key: string,
    value: Promise<U> | U,
    options?: ItemOptions
  ) {
    const now = Date.now();
    const expiresAt =
      (options?.ttl ?? this.ttl) === 0
        ? +Infinity
        : now + (options?.ttl || this.ttl);

    const isPromise = value instanceof Promise;
    const isNewKey = !this.cache.has(key);

    if (isNewKey) {
      // Evict before inserting if we're at capacity
      this._evictIfNeeded();
    } else {
      // Delete existing key so re-insert moves it to end (most recently used)
      this.cache.delete(key);
    }

    this.cache.set(key, {
      key,
      promise: value,
      expiresAt,
      isResolved: !isPromise,
    });

    // Track promise resolution to enable future eviction
    if (isPromise) {
      (value as Promise<U>).then(
        () => this._markResolved(key),
        () => this._markResolved(key)
      );
    }

    // Ensure cleanup is running when a new item is added
    this._startCleanup();
  }

  private async _handlePromise<U extends LooseIfUnknown<T>>(
    key: string,
    promise: Promise<U> | U
  ): Promise<U> {
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

  /**
   * Moves an item to the end of the Map (most recently used position).
   * This exploits Map's insertion order for O(1) LRU tracking.
   */
  private _moveToEnd(key: string, item: CachedItem<LooseIfUnknown<T>>): void {
    this.cache.delete(key);
    this.cache.set(key, item);
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
      if (item.expiresAt <= now) this._delete(key);
    }
  }

  /**
   * Evicts least recently used entries until cache is under maxEntries.
   * Protects entries with pending (unresolved) promises from eviction.
   */
  private _evictIfNeeded(): void {
    if (this.maxEntries === undefined) return;

    while (this.cache.size >= this.maxEntries) {
      const evictKey = this._findLRUCandidate();
      if (evictKey === null) {
        // All items are pending promises - cannot evict
        break;
      }
      this._delete(evictKey);
    }

    this._stopCleanupIfNeeded();
  }

  /**
   * Finds the least recently used item that is safe to evict.
   * Uses Map insertion order - first resolved item is LRU.
   * Skips items with pending (unresolved) promises.
   * Returns null if no evictable items exist.
   */
  private _findLRUCandidate(): string | null {
    for (const [key, item] of this.cache) {
      if (item.isResolved) {
        return key;
      }
    }
    return null;
  }

  /**
   * Marks a cached item as resolved, making it eligible for LRU eviction.
   */
  private _markResolved(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      item.isResolved = true;
    }
  }

  private _fetchValue<U extends LooseIfUnknown<T>>(
    fetcherOrPromise: FetchOrPromise<U>
  ): Promise<U> | U {
    // Wrap in Promise.resolve to ensure consistent behavior
    return Promise.resolve(
      typeof fetcherOrPromise === "function"
        ? (fetcherOrPromise as () => Promise<U> | U)()
        : fetcherOrPromise
    );
  }
}
