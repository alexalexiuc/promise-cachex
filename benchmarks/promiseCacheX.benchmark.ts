import { Bench } from "tinybench";
import { PromiseCacheX } from "../src/PromiseCacheX";

const bench = new Bench({ time: 60_000 }); // Run for 60 seconds
const fetcher = async () => "test_value";

const results: Record<string, { memory: number; cpu: number }> = {};

/** Measure memory & CPU usage */
const measurePerformance = (): { memory: number; cpu: number } => {
  const memory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  const cpu = process.cpuUsage().user / 1000; // ms
  return { memory, cpu };
};

/** Store metrics after each test */
const logPerformance = (label: string) => {
  results[label] = measurePerformance();
};

/** Populate the cache with N keys */
const populateCache = async (numKeys: number, cache: PromiseCacheX) => {
  for (let i = 0; i < numKeys; i++) {
    await cache.get(`key-${i}`, fetcher, { ttl: 5000 });
  }
};

const cache1000 = new PromiseCacheX();
const cache10000 = new PromiseCacheX();

bench
  .add("Cache 1,000 Keys", async () => {
    await populateCache(1000, cache1000);
    logPerformance("After caching 1,000 keys");
  })
  .add("Cache 10,000 Keys", async () => {
    await populateCache(10000, cache10000);
    logPerformance("After caching 10,000 keys");
  })
  .add("Retrieve Cached Values (1,000 keys)", async () => {
    for (let i = 0; i < 1000; i++) {
      await cache1000.get(`key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance("After retrieving 1,000 keys");
  })
  .add("Retrieve Cached Values (10,000 keys)", async () => {
    for (let i = 0; i < 10000; i++) {
      await cache10000.get(`key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance("After retrieving 10,000 keys");
  });

(async () => {
  console.log("Starting Benchmark...");
  console.time("Benchmark Duration");
  await bench.run();

  // Print benchmark table
  console.table(bench.table());

  // Print memory & CPU usage summary
  console.log("\nPerformance Summary:");
  console.table(results);
  console.timeEnd("Benchmark Duration");
  process.exit(0);
})();
