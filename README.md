# PromiseCacheX

## 🚀 High-Performance Promise-Based Caching for JavaScript & TypeScript

PromiseCacheX is a lightweight caching library designed to store and manage **asynchronous promises and synchronous values efficiently**. It eliminates redundant requests, prevents race conditions, and automatically cleans up expired cache entries.

---

## 📚 Installation

```sh
npm install promise-cachex
```

---

## 🔧 Usage

```typescript
import { PromiseCacheX } from "promise-cachex";

const cache = new PromiseCacheX({ ttl: 5000, cleanupInterval: 2000 }); // 5s TTL, cleanup every 2s

async function fetchData() {
  return new Promise((resolve) =>
    setTimeout(() => resolve("cached data"), 1000)
  );
}

(async () => {
  const result1 = await cache.get("key1", fetchData, { ttl: 5000 });
  console.log(result1); // 'cached data'

  const result2 = await cache.get("key1", fetchData, { ttl: 5000 });
  console.log(result2); // Returns cached value immediately
})();

// Supports caching synchronous values too
cache.get("key2", "static value");
console.log(await cache.get("key2", "static value")); // 'static value'
```

---

## ⚡ Features

✅ **Promise-Aware** – Stores and returns pending promises to avoid duplicate calls.
✅ **Supports Both Async and Sync Values** – Cache promises, async functions, sync functions, or direct values.
✅ **TTL Expiry** – Items automatically expire after a configurable time.
✅ **Automatic Cleanup** – Removes expired entries at a regular interval.
✅ **Manual Deletion** – Allows explicit cache clearing when needed.
✅ **Error Handling** – Removes failed promises from the cache.
✅ **Efficient & Fast** – Optimized for speed and low memory overhead.

---

## 🐜 API

### **`constructor(options?: CacheOptions)`**

Creates a new instance of `PromiseCacheX`.

| Option            | Type     | Default              | Description                                       |
| ----------------- | -------- | -------------------- | ------------------------------------------------- |
| `ttl`             | `number` | `3600000` (1 hour)   | Default TTL in milliseconds. `0` means no TTL.    |
| `cleanupInterval` | `number` | `300000` (5 minutes) | Interval in milliseconds to remove expired items. |

---

### **`get<T>(key: string, fetcherOrPromise: FetchOrPromise<T>, options?: ItemOptions): Promise<T>`**

Retrieves a cached value or fetches and caches it if not available.

| Option | Type     | Default   | Description                                |
| ------ | -------- | --------- | ------------------------------------------ |
| `ttl`  | `number` | Cache TTL | TTL for the cached item. `0` means no TTL. |

**FetchOrPromise<T>** can be:

- An **async function** returning a promise (`() => Promise<T>`)
- A **synchronous function** returning a value (`() => T`)
- A **direct promise** (`Promise<T>`)
- A **direct value** (`T`)

```typescript
// Caching an async function
const result = await cache.get("key1", async () => "value", { ttl: 5000 });

// Caching a synchronous function
const syncResult = await cache.get("key2", () => "sync value");

// Caching a direct promise
const promiseResult = await cache.get(
  "key3",
  Promise.resolve("promised value")
);

// Caching a direct value
const directResult = await cache.get("key4", "direct value");
```

---

### **`delete(key: string): void`**

Removes a specific key from the cache.

```typescript
cache.delete("key1");
```

---

### **`clear(): void`**

Clears all cached entries.

```typescript
cache.clear();
```

---

### **`size(): number`**

Returns the number of cached items.

```typescript
console.log(cache.size());
```

---

### **`keys(): string[]`**

Returns an array of cached keys.

```typescript
console.log(cache.keys());
```

---

## 📊 Benchmark Results

Here are the latest performance benchmarks for `PromiseCacheX`:

### **Operations Performance**

| Task                                 | Latency Avg (ns) | Throughput Avg (ops/s) |
| ------------------------------------ | ---------------- | ---------------------- |
| Cache 1,000 Keys                     | 216,853          | 4,824                  |
| Cache 10,000 Keys                    | 2,213,626        | 461                    |
| Retrieve Cached Values (1,000 keys)  | 221,039          | 4,756                  |
| Retrieve Cached Values (10,000 keys) | 2,136,370        | 476                    |

### **Memory & CPU Usage**

| Action                       | Memory (MB) | CPU Time (ms) |
| ---------------------------- | ----------- | ------------- |
| After caching 1,000 keys     | 153.22      | 21,296        |
| After caching 10,000 keys    | 208.22      | 39,687        |
| After retrieving 1,000 keys  | 206.88      | 60,765        |
| After retrieving 10,000 keys | 271.31      | 83,984        |

---

## 🔥 Why Use `PromiseCacheX`?

- 🏆 **Prevents duplicate async requests** (efficient shared promises)
- ⚡ **Fast and lightweight** (optimized caching)
- 🛡 **Ensures memory efficiency** (auto-expiring cache)
- 🔥 **Great for API calls, database queries, and computations**
- 🌟 **Supports both async and sync values** (no need for multiple caching libraries)

---

## 📜 License

MIT License.

🚀 **Try `PromiseCacheX` today!**
