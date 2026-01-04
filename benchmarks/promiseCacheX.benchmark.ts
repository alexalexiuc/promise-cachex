import { Bench } from 'tinybench';
import { PromiseCacheX } from '../src/PromiseCacheX';

const bench = new Bench({ time: 60_000 }); // Run for 60 seconds
const fetcher = async () => 'test_value';

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

// LRU bounded caches for eviction benchmarks
const lruCache1000 = new PromiseCacheX({ maxEntries: 1000 });
const lruCache100 = new PromiseCacheX({ maxEntries: 100 });

bench
  .add('Cache 1,000 Keys', async () => {
    await populateCache(1000, cache1000);
    logPerformance('After caching 1,000 keys');
  })
  .add('Cache 10,000 Keys', async () => {
    await populateCache(10000, cache10000);
    logPerformance('After caching 10,000 keys');
  })
  .add('Retrieve Cached Values (1,000 keys)', async () => {
    for (let i = 0; i < 1000; i++) {
      await cache1000.get(`key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance('After retrieving 1,000 keys');
  })
  .add('Retrieve Cached Values (10,000 keys)', async () => {
    for (let i = 0; i < 10000; i++) {
      await cache10000.get(`key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance('After retrieving 10,000 keys');
  })
  .add('LRU Eviction (10,000 inserts, max 1,000)', async () => {
    // Insert 10,000 keys into cache with maxEntries=1000
    // This triggers 9,000 evictions
    for (let i = 0; i < 10000; i++) {
      await lruCache1000.get(`lru-key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance('After LRU eviction (10k inserts, max 1k)');
  })
  .add('LRU Eviction (10,000 inserts, max 100)', async () => {
    // Insert 10,000 keys into cache with maxEntries=100
    // This triggers 9,900 evictions - more pressure
    for (let i = 0; i < 10000; i++) {
      await lruCache100.get(`lru-key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance('After LRU eviction (10k inserts, max 100)');
  })
  .add('LRU Cache Hits with Reordering (1,000 keys)', async () => {
    // Pre-populate, then access in reverse order to trigger reordering
    const reorderCache = new PromiseCacheX({ maxEntries: 1000 });
    await populateCache(1000, reorderCache);
    // Access in reverse order - each hit triggers _moveToEnd
    for (let i = 999; i >= 0; i--) {
      await reorderCache.get(`key-${i}`, fetcher, { ttl: 5000 });
    }
    logPerformance('After LRU reordering (1k keys)');
  });

(async () => {
  console.log('Starting Benchmark...');
  console.time('Benchmark Duration');
  await bench.run();

  // Print benchmark table
  console.table(bench.table());

  // Print memory & CPU usage summary
  console.log('\nPerformance Summary:');
  console.table(results);
  console.timeEnd('Benchmark Duration');
  process.exit(0);
})();
