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
✅ **LRU Eviction** – Bounded caches with least-recently-used eviction policy.
✅ **Automatic Cleanup** – Removes expired entries at a regular interval.
✅ **Manual Deletion** – Allows explicit cache clearing when needed.
✅ **Error Handling** – Removes failed promises from the cache.
✅ **Efficient & Fast** – Optimized for speed and low memory overhead.

---

## 🗑️ LRU Eviction (Bounded Cache)

For production use cases where memory must be bounded, use the `maxEntries` option to limit cache entries:

```typescript
const cache = new PromiseCacheX({
  ttl: 60000,
  maxEntries: 1000  // Maximum 1000 entries
});

// When cache reaches 1000 entries, least recently used items are evicted
for (let i = 0; i < 1500; i++) {
  await cache.get(`key${i}`, `value${i}`);
}
console.log(cache.size()); // 1000
```

### How LRU Eviction Works

1. **Access Tracking** – Each `get()` call updates the item's "last accessed" timestamp
2. **Eviction on Insert** – When adding a new key would exceed `maxEntries`, the least recently accessed item is evicted
3. **Pending Promise Protection** – Items with unresolved promises are **never evicted** to preserve promise coalescing

### Important Behaviors

- **TTL vs LRU**: Items may be evicted before their TTL expires if the cache is at capacity
- **Backward Compatible**: If `maxEntries` is not set, the cache is unbounded (original behavior)
- **Temporary Overflow**: If all items have pending promises, cache may temporarily exceed `maxEntries`

```typescript
// Pending promises are protected from eviction
const cache = new PromiseCacheX({ maxEntries: 2 });

const slow = cache.get("slow", () =>
  new Promise(r => setTimeout(() => r("done"), 5000))
);

await cache.get("key1", "value1");
await cache.get("key2", "value2"); // Evicts key1, not "slow"

console.log(cache.has("slow")); // true (protected while pending)
```

---

## 🐜 API

### **`constructor(options?: CacheOptions)`**

Creates a new instance of `PromiseCacheX`.

| Option            | Type     | Default              | Description                                       |
| ----------------- | -------- | -------------------- | ------------------------------------------------- |
| `ttl`             | `number` | `3600000` (1 hour)   | Default TTL in milliseconds. `0` means no TTL.    |
| `cleanupInterval` | `number` | `300000` (5 minutes) | Interval in milliseconds to remove expired items. |
| `maxEntries`      | `number` | `undefined`          | Max cache entries. When reached, LRU items are evicted. |

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
### **`set<T>(key: string, value: T | Promise<T>, options?: ItemOptions): void`**

Sets a value in the cache.

```typescript
cache.set("key1", "value1", { ttl: 5000 });
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

### **`has(key: string): boolean`**
Checks if a key exists in the cache.

```typescript
console.log(cache.has("key1"));
```

---

### **`getMaxEntries(): number | undefined`**

Returns the maximum entries limit, or `undefined` if unbounded.

```typescript
const cache = new PromiseCacheX({ maxEntries: 1000 });
console.log(cache.getMaxEntries()); // 1000
```

---

### **`isAtCapacity(): boolean`**

Returns `true` if the cache is at or over its maximum entries limit.

```typescript
const cache = new PromiseCacheX({ maxEntries: 2 });
await cache.get("key1", "value1");
console.log(cache.isAtCapacity()); // false
await cache.get("key2", "value2");
console.log(cache.isAtCapacity()); // true
```

---

## 🔤 Typing Modes: **Strict vs Loose** (Generics)

`PromiseCacheX` lets you choose between **strict, single-type caches** and a **loose, multi-type cache**—and still allows **per-call type parameters** on `get`/`set`.

### How it works

The class is generic: `PromiseCacheX<T = unknown>`.

* If you **omit** `T`, the cache runs in **loose mode** (accepts mixed value types).
* If you **provide** `T`, the cache runs in **strict mode** (all values must conform to `T`).
* You can still provide a type argument to `get<U>()` and `set<U>()`, but it is **constrained** so that `U` must extend the cache’s type.

**Method signatures (simplified):**

```ts
class PromiseCacheX<T = unknown> {
  get<U extends T = T>(
    key: string,
    fetcherOrPromise: (() => Promise<U> | U) | Promise<U> | U,
    options?: { ttl?: number }
  ): Promise<U>;

  set<U extends T>(
    key: string,
    value: U | Promise<U>,
    options?: { ttl?: number }
  ): void;
}
```

> Note: When `T` is omitted, the library treats it as “loose” so mixed types are allowed. When `T` is provided, `U` is constrained to that type.

---

### 🧰 Loose mode (no generic) — store **multiple types**

When you don’t pass a generic, you can mix types freely. You may still annotate each call for clarity.

```ts
import { PromiseCacheX } from "promise-cachex";

const loose = new PromiseCacheX(); // T omitted → loose mode

// Store different types
await loose.get<number>("n1", 42);
await loose.get<string>("s1", () => "hello");
await loose.get<{ id: string }>("u1", Promise.resolve({ id: "abc" }));

// All OK — loose mode accepts them
```

Use this for a shared utility cache with heterogeneous values.

---

### 🔒 Strict mode (typed cache) — enforce **one value type**

Provide `T` to restrict the cache to a single type. Per-call generics on `get`/`set` must **extend** that type.

```ts
type User = { id: number; name: string };

const strict = new PromiseCacheX<User>(); // typed cache

// ✅ OK: value matches `User`
await strict.get<User>("u:1", () => ({ id: 1, name: "Ana" }));

// ❌ Error: `string` does not extend `User`
// await strict.get<string>("bad", "oops");

// ✅ OK: promise of `User`
strict.set("u:2", Promise.resolve({ id: 2, name: "Ion" }));
```

This is ideal for domain caches (e.g., Users, Products) where consistency matters.

---

### 🎯 Narrowing inside strict mode

Because `U extends T`, you can **narrow** on a call when it’s safe:

```ts
type User = { id: number; name: string };
type MaybeUser = User | null;

const cache = new PromiseCacheX<MaybeUser>();

// ✅ OK: `User` is a subtype of `User | null`
const u = await cache.get<User>("u:1", async () => ({ id: 1, name: "Ana" }));

// ✅ Also OK: storing `null`
await cache.get<MaybeUser>("u:2", null);

// ❌ Error: `string` not assignable to `User | null`
// await cache.get<string>("bad", "nope");
```

> Tip: Using unions like `User | null` lets you express cacheable absence while keeping strong typing.

---

### ✅ When to use which

* **Loose mode** (omit `T`): quick utility cache, heterogeneous values, prototyping.
* **Strict mode** (`PromiseCacheX<T>`): domain caches with strong guarantees and easier refactors.
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
