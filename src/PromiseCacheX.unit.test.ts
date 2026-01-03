import { PromiseCacheX } from "./PromiseCacheX";

describe("PromiseCacheX", () => {
  let cache: PromiseCacheX;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new PromiseCacheX({ ttl: 5000, cleanupInterval: 2000 });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should store and retrieve a value", async () => {
    const fetcher = jest.fn().mockResolvedValue("test-value");
    const result = await cache.get("key1", fetcher);

    expect(result).toBe("test-value");
    expect(fetcher).toHaveBeenCalledTimes(1);

    const cachedResult = await cache.get("key1", fetcher);
    expect(cachedResult).toBe("test-value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("should cache promises and return the same pending promise for multiple calls", async () => {
    const fetcher = jest
      .fn()
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve("delayed-value"), 500)
          )
      );

    const promise1 = cache.get("key1", fetcher, { ttl: 5000 });
    const promise2 = cache.get("key1", fetcher, { ttl: 5000 });

    await jest.advanceTimersByTimeAsync(501);

    expect(fetcher).toHaveBeenCalledTimes(1);

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBe("delayed-value");
    expect(result2).toBe("delayed-value");
  });

  it("should expire cached values after TTL", async () => {
    const fetcher = jest.fn().mockResolvedValue("expiring-value");

    await cache.get("key1", fetcher, { ttl: 5000 });

    jest.advanceTimersByTime(5001);

    await cache.get("key1", fetcher, { ttl: 5000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should delete cache entry when promise rejects", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("Fetch failed"));

    await expect(cache.get("key1", fetcher, { ttl: 5000 })).rejects.toThrow(
      "Fetch failed"
    );

    expect(cache.size()).toBe(0);
  });

  it("should handle multiple keys correctly", async () => {
    const fetcher1 = jest.fn().mockResolvedValue("value1");
    const fetcher2 = jest.fn().mockResolvedValue("value2");

    const result1 = await cache.get("key1", fetcher1, { ttl: 5000 });
    const result2 = await cache.get("key2", fetcher2, { ttl: 5000 });

    expect(result1).toBe("value1");
    expect(result2).toBe("value2");
    expect(fetcher1).toHaveBeenCalledTimes(1);
    expect(fetcher2).toHaveBeenCalledTimes(1);
  });

  it("should clear all keys when clear() is called", async () => {
    const fetcher = jest.fn().mockResolvedValue("test-value");

    await cache.get("key1", fetcher, { ttl: 5000 });
    await cache.get("key2", fetcher, { ttl: 5000 });

    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("should delete specific keys correctly", async () => {
    const fetcher = jest.fn().mockResolvedValue("test-value");

    await cache.get("key1", fetcher, { ttl: 5000 });
    await cache.get("key2", fetcher, { ttl: 5000 });

    cache.delete("key1");

    expect(cache.size()).toBe(1);
    expect(cache.keys()).toEqual(["key2"]);
  });

  it("should handle cleanup interval properly", async () => {
    const fetcher = jest.fn().mockResolvedValue("cleanup-test");

    await cache.get("key1", fetcher, { ttl: 2000 });

    expect(cache.size()).toBe(1);

    jest.advanceTimersByTime(2501);
    expect(cache.size()).toBe(0);
  });

  it("should not delete items before TTL", async () => {
    const fetcher = jest.fn().mockResolvedValue("valid");

    await cache.get("key1", fetcher, { ttl: 5000 });

    jest.advanceTimersByTime(4000); // Move time forward, but not past TTL

    expect(cache.size()).toBe(1); // Cache should still hold the item
  });

  it("should correctly return cache size", async () => {
    const fetcher = jest.fn().mockResolvedValue("value");

    expect(cache.size()).toBe(0);

    await cache.get("key1", fetcher, { ttl: 5000 });
    await cache.get("key2", fetcher, { ttl: 5000 });

    expect(cache.size()).toBe(2);
  });

  it("should correctly return cache keys", async () => {
    const fetcher = jest.fn().mockResolvedValue("value");

    await cache.get("keyA", fetcher, { ttl: 5000 });
    await cache.get("keyB", fetcher, { ttl: 5000 });

    expect(cache.keys().sort()).toEqual(["keyA", "keyB"]);
  });

  it("should not cleanup if TTL is 0", async () => {
    const fetcher = jest.fn().mockResolvedValue("idnefinable");

    await cache.get("key1", fetcher, { ttl: 0 });

    jest.advanceTimersByTime(10001);
    expect(cache.size()).toBe(1);
  });

  it("Should also cache a non-async function", async () => {
    const fetcher = jest.fn().mockReturnValue("simple-value");

    const result = await cache.get("simple-key", fetcher);
    const result2 = await cache.get("simple-key", fetcher);

    expect(result).toBe("simple-value");
    expect(result2).toBe("simple-value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("Should also cache a promise", async () => {
    const promise = jest.fn().mockResolvedValue("simple-promise");

    const result = await cache.get("simple-key", promise);
    const result2 = await cache.get("simple-key", promise);

    expect(result).toBe("simple-promise");
    expect(result2).toBe("simple-promise");
    expect(promise).toHaveBeenCalledTimes(1);
  });

  it("Should also cache a simple value", async () => {
    const result = await cache.get("simple-key", "simple-value");
    expect(result).toBe("simple-value");
  });

  it('Should return true for "has" if key exists', async () => {
    const fetcher = jest.fn().mockResolvedValue("value");

    await cache.get("key1", fetcher, { ttl: 5000 });

    expect(cache.has("key1")).toBe(true);
    expect(cache.has("key2")).toBe(false);
  });
  
  it('Should set a value using set()', async () => {
    cache.set("key1", "value1", { ttl: 5000 });
    expect(cache.has("key1")).toBe(true);
    expect(await cache.get("key1", () => "new-value")).toBe("value1");
  });

  describe("PromiseCacheX - Cleanup Interval", () => {
    let cache: PromiseCacheX;
    let setIntervalSpy: jest.SpyInstance;
    let clearIntervalSpy: jest.SpyInstance;

    beforeEach(() => {
      setIntervalSpy = jest.spyOn(global, "setInterval");
      clearIntervalSpy = jest.spyOn(global, "clearInterval");

      cache = new PromiseCacheX({ ttl: 1000, cleanupInterval: 5000 });
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.restoreAllMocks();
    });

    it("should start the cleanup interval when an item is added", async () => {
      expect(setIntervalSpy).not.toHaveBeenCalled();

      await cache.get("key1", async () => "value", { ttl: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("should stop the cleanup interval when cache is empty", async () => {
      await cache.get("key1", async () => "value", { ttl: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      cache.delete("key1");

      jest.runOnlyPendingTimers();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("should restart the interval when a new item is added after cleanup", async () => {
      await cache.get("key1", async () => "value", { ttl: 1000 });
      cache.delete("key1");

      jest.runOnlyPendingTimers();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

      await cache.get("key2", async () => "another value", { ttl: 1000 });

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it("should not start the cleanup interval if cleanupInterval is 0", async () => {
      cache = new PromiseCacheX({ ttl: 1000, cleanupInterval: 0 });

      expect(setIntervalSpy).not.toHaveBeenCalled();

      await cache.get("key1", async () => "value", { ttl: 1000 });

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
  
  describe("Type Handling", () => {
    it('Should restrict type on get if class instantiated with generic type', async () => {
      const typedCache = new PromiseCacheX<number>({ ttl: 5000 });
      const fetcher = jest.fn().mockResolvedValue(42);

      await typedCache.get("num-key", fetcher);

      // @ts-expect-error - Should error if fetcher returns wrong type
      await typedCache.get("num-key", async () => "string-value");
    });

    it('Should restrict type on set if class instantiated with generic type', () => {
      const typedCache = new PromiseCacheX<string>({ ttl: 5000 });

      typedCache.set("str-key", "a string value");

      // @ts-expect-error - Should error if setting wrong type
      typedCache.set("str-key", 12345);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used item when maxEntries is reached", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 3 });

      await lruCache.get("key1", "value1");
      await lruCache.get("key2", "value2");
      await lruCache.get("key3", "value3");

      expect(lruCache.size()).toBe(3);

      // Adding 4th item should evict key1 (oldest)
      await lruCache.get("key4", "value4");

      expect(lruCache.size()).toBe(3);
      expect(lruCache.has("key1")).toBe(false);
      expect(lruCache.has("key2")).toBe(true);
      expect(lruCache.has("key3")).toBe(true);
      expect(lruCache.has("key4")).toBe(true);
    });

    it("should not evict recently accessed items", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 3 });

      await lruCache.get("key1", "value1");
      jest.advanceTimersByTime(100);
      await lruCache.get("key2", "value2");
      jest.advanceTimersByTime(100);
      await lruCache.get("key3", "value3");

      // Access key1 to make it recently used
      jest.advanceTimersByTime(100);
      await lruCache.get("key1", "value1");

      // Adding 4th item should evict key2 (least recently accessed)
      jest.advanceTimersByTime(100);
      await lruCache.get("key4", "value4");

      expect(lruCache.size()).toBe(3);
      expect(lruCache.has("key1")).toBe(true);
      expect(lruCache.has("key2")).toBe(false);
      expect(lruCache.has("key3")).toBe(true);
      expect(lruCache.has("key4")).toBe(true);
    });

    it("should protect pending promises from eviction", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      // Create a slow pending promise
      let resolvePending: (value: string) => void;
      const pendingPromise = new Promise<string>((resolve) => {
        resolvePending = resolve;
      });

      // Start the pending request (not awaited yet)
      const pending = lruCache.get("pending", () => pendingPromise);

      // Add resolved items
      await lruCache.get("key1", "value1");

      // Cache is at capacity (pending + key1), but pending is protected
      // Adding another should evict key1, not pending
      await lruCache.get("key2", "value2");

      expect(lruCache.has("pending")).toBe(true);
      expect(lruCache.has("key1")).toBe(false);
      expect(lruCache.has("key2")).toBe(true);

      // Resolve the pending promise
      resolvePending!("resolved");
      await pending;
    });

    it("should allow eviction of resolved promises", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      // Add two resolved items
      await lruCache.get("key1", "value1");
      jest.advanceTimersByTime(100);
      await lruCache.get("key2", "value2");

      // Both are now resolved and evictable
      jest.advanceTimersByTime(100);
      await lruCache.get("key3", "value3");

      expect(lruCache.size()).toBe(2);
      expect(lruCache.has("key1")).toBe(false);
      expect(lruCache.has("key2")).toBe(true);
      expect(lruCache.has("key3")).toBe(true);
    });

    it("should not evict items when maxEntries is undefined (backward compatible)", async () => {
      const unboundedCache = new PromiseCacheX({ ttl: 5000 });

      for (let i = 0; i < 100; i++) {
        await unboundedCache.get(`key${i}`, `value${i}`);
      }

      expect(unboundedCache.size()).toBe(100);
      expect(unboundedCache.getMaxEntries()).toBeUndefined();
    });

    it("should return correct maxEntries and isAtCapacity values", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      expect(lruCache.getMaxEntries()).toBe(2);
      expect(lruCache.isAtCapacity()).toBe(false);

      await lruCache.get("key1", "value1");
      expect(lruCache.isAtCapacity()).toBe(false);

      await lruCache.get("key2", "value2");
      expect(lruCache.isAtCapacity()).toBe(true);
    });

    it("should handle edge case when all items are pending", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      let resolve1: (value: string) => void;
      let resolve2: (value: string) => void;

      const promise1 = new Promise<string>((r) => { resolve1 = r; });
      const promise2 = new Promise<string>((r) => { resolve2 = r; });

      const p1 = lruCache.get("pending1", () => promise1);
      const p2 = lruCache.get("pending2", () => promise2);

      // Both are pending, cannot evict either
      // Adding a third should exceed maxEntries but not crash
      const p3 = lruCache.get("pending3", "immediate");

      expect(lruCache.size()).toBe(3); // Exceeds maxEntries temporarily

      // Resolve promises
      resolve1!("resolved1");
      resolve2!("resolved2");
      await Promise.all([p1, p2, p3]);
    });

    it("should not evict item being updated", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      await lruCache.get("key1", "value1");
      await lruCache.get("key2", "value2");

      // Update key1 should not trigger eviction of key1 itself
      lruCache.set("key1", "updated-value1");

      expect(lruCache.size()).toBe(2);
      expect(await lruCache.get("key1", "fallback")).toBe("updated-value1");
    });

    it("should update LRU position when set() is called on existing key", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 3 });

      await lruCache.get("key1", "value1");
      await lruCache.get("key2", "value2");
      await lruCache.get("key3", "value3");

      // Update key1 via set() - should move it to most recently used
      lruCache.set("key1", "updated-value1");

      // Adding key4 should evict key2 (now the LRU), not key1
      await lruCache.get("key4", "value4");

      expect(lruCache.size()).toBe(3);
      expect(lruCache.has("key1")).toBe(true); // Updated, so moved to end
      expect(lruCache.has("key2")).toBe(false); // LRU, evicted
      expect(lruCache.has("key3")).toBe(true);
      expect(lruCache.has("key4")).toBe(true);
    });

    it("should work correctly with TTL expiration", async () => {
      const lruCache = new PromiseCacheX({
        ttl: 1000,
        maxEntries: 3,
        cleanupInterval: 500
      });

      await lruCache.get("key1", "value1");
      await lruCache.get("key2", "value2");
      await lruCache.get("key3", "value3");

      // Expire key1 via TTL
      jest.advanceTimersByTime(1001);

      // key1 should be expired but still in cache until cleanup
      // Add key4 should evict based on LRU (key1 already expired)
      await lruCache.get("key4", "value4");

      expect(lruCache.has("key4")).toBe(true);
    });

    it("should handle maxEntries of 1", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 1 });

      await lruCache.get("key1", "value1");
      expect(lruCache.size()).toBe(1);

      await lruCache.get("key2", "value2");
      expect(lruCache.size()).toBe(1);
      expect(lruCache.has("key1")).toBe(false);
      expect(lruCache.has("key2")).toBe(true);
    });

    it("should mark rejected promises as resolved for eviction", async () => {
      const lruCache = new PromiseCacheX({ ttl: 5000, maxEntries: 2 });

      // The rejected promise will be removed from cache due to error handling
      await expect(
        lruCache.get("key1", () => Promise.reject(new Error("fail")))
      ).rejects.toThrow("fail");

      // Cache should be empty (rejected promises are auto-removed)
      expect(lruCache.size()).toBe(0);

      // Add items normally
      await lruCache.get("key2", "value2");
      await lruCache.get("key3", "value3");
      expect(lruCache.size()).toBe(2);
    });
  });
});
