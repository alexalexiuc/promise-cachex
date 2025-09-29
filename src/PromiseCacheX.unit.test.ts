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
});
