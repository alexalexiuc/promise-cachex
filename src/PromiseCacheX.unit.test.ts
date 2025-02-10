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
});
