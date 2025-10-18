/**
 * Unit Tests for PerformanceOptimizer Utility
 *
 * These tests verify the performance optimization functionality including
 * batch processing, concurrency control, caching, and memory management.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceOptimizer, PerformancePresets, PerformanceConfig } from '../../src/utils/performance-optimizer';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;
  let mockMemoryUsage: number;

  beforeEach(() => {
    // Mock process.memoryUsage for testing
    mockMemoryUsage = 100; // 100 MB
    vi.mock('process', () => ({
      memoryUsage: () => ({
        heapUsed: mockMemoryUsage * 1024 * 1024
      })
    }));

    optimizer = new PerformanceOptimizer({
      batchSize: 5,
      maxConcurrency: 2,
      timeoutMs: 1000,
      memoryThresholdMB: 200,
      enableCaching: true,
      cacheMaxSize: 10,
      enableLazyLoading: true,
      enableCompression: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    optimizer.clearCache();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultOptimizer = new PerformanceOptimizer();
      expect(defaultOptimizer).toBeDefined();
    });

    test('should merge custom configuration with defaults', () => {
      const customConfig = {
        batchSize: 15,
        maxConcurrency: 5,
        enableCaching: false
      };

      const customOptimizer = new PerformanceOptimizer(customConfig);
      const report = customOptimizer.getPerformanceReport();

      expect(customOptimizer).toBeDefined();
      expect(report.summary.totalSessions).toBe(0);
    });

    test('should use performance presets', () => {
      const ciOptimizer = new PerformanceOptimizer(PerformancePresets.ci);
      const devOptimizer = new PerformanceOptimizer(PerformancePresets.development);
      const largeOptimizer = new PerformanceOptimizer(PerformancePresets.large);
      const minimalOptimizer = new PerformanceOptimizer(PerformancePresets.minimal);

      expect(ciOptimizer).toBeDefined();
      expect(devOptimizer).toBeDefined();
      expect(largeOptimizer).toBeDefined();
      expect(minimalOptimizer).toBeDefined();
    });

    test('should have different configurations for different presets', () => {
      const ciConfig = PerformancePresets.ci;
      const devConfig = PerformancePresets.development;
      const largeConfig = PerformancePresets.large;

      expect(ciConfig.batchSize).toBeLessThan(devConfig.batchSize);
      expect(largeConfig.batchSize).toBeGreaterThan(devConfig.batchSize);
      expect(largeConfig.memoryThresholdMB).toBeGreaterThan(devConfig.memoryThresholdMB);
    });
  });

  describe('Batch Processing', () => {
    test('should process items in batches', async () => {
      const items = Array.from({ length: 12 }, (_, i) => i);
      const processor = vi.fn().mockImplementation(async (batch: number[]) =>
        batch.map(item => item * 2)
      );
      const onProgress = vi.fn();

      const results = await optimizer.processBatched(items, processor, onProgress);

      expect(results).toHaveLength(12);
      expect(processor).toHaveBeenCalledTimes(3); // 12 items / 5 batch size = 3 batches
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    test('should handle empty item array', async () => {
      const processor = vi.fn();
      const onProgress = vi.fn();

      const results = await optimizer.processBatched([], processor, onProgress);

      expect(results).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
      expect(onProgress).not.toHaveBeenCalled();
    });

    test('should handle processor errors gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn()
        .mockResolvedValueOnce([1, 2])
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValue([5]);

      await expect(
        optimizer.processBatched(items, processor)
      ).rejects.toThrow('Batch processing failed at items 5-9');

      expect(processor).toHaveBeenCalledTimes(2); // Should stop after failure
    });

    test('should call onProgress callback with correct values', async () => {
      const items = Array.from({ length: 12 }, (_, i) => i);
      const processor = vi.fn().mockImplementation(async (batch: number[]) => batch);
      const onProgress = vi.fn();

      await optimizer.processBatched(items, processor, onProgress);

      expect(onProgress).toHaveBeenCalledWith(5, 12);
      expect(onProgress).toHaveBeenCalledWith(10, 12);
      expect(onProgress).toHaveBeenCalledWith(12, 12);
    });
  });

  describe('Concurrent Processing', () => {
    test('should process items concurrently with controlled concurrency', async () => {
      const items = [1, 2, 3, 4];
      const processor = vi.fn().mockImplementation(async (item: number) =>
        item * 2
      );
      const onProgress = vi.fn();

      const results = await optimizer.processConcurrently(items, processor, onProgress);

      expect(results).toEqual([2, 4, 6, 8]);
      expect(processor).toHaveBeenCalledTimes(4);
      expect(onProgress).toHaveBeenCalledTimes(4);
    });

    test('should respect concurrency limit', async () => {
      // Create a slow processor to test concurrency control
      let activeCount = 0;
      let maxActiveCount = 0;

      const items = [1, 2, 3, 4, 5, 6];
      const processor = vi.fn().mockImplementation(async (item: number) => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        activeCount--;
        return item * 2;
      });

      await optimizer.processConcurrently(items, processor);

      // With maxConcurrency=2, should never have more than 2 active processes
      expect(maxActiveCount).toBeLessThanOrEqual(2);
    });

    test('should handle processor failures', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn()
        .mockResolvedValueOnce(2)
        .mockRejectedValueOnce(new Error('Item 2 failed'))
        .mockResolvedValue(6);

      await expect(
        optimizer.processConcurrently(items, processor)
      ).rejects.toThrow('Concurrent processing failed for 1 items');

      // Should process other items successfully
      expect(processor).toHaveBeenCalledTimes(3);
    });
  });

  describe('Lazy Loading', () => {
    test('should create lazy loader that loads data only once', async () => {
      const factory = vi.fn().mockResolvedValue('expensive-data');
      const loader = optimizer.createLazyLoader(factory);

      // First call should trigger factory
      const result1 = await loader();
      expect(factory).toHaveBeenCalledTimes(1);
      expect(result1).toBe('expensive-data');

      // Second call should use cached value
      const result2 = await loader();
      expect(factory).toHaveBeenCalledTimes(1); // Still called only once
      expect(result2).toBe('expensive-data');
    });

    test('should handle concurrent lazy loading', async () => {
      const factory = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'concurrent-data';
      });
      const loader = optimizer.createLazyLoader(factory);

      // Start multiple concurrent loads
      const [result1, result2, result3] = await Promise.all([
        loader(),
        loader(),
        loader()
      ]);

      expect(factory).toHaveBeenCalledTimes(1); // Should only be called once
      expect(result1).toBe('concurrent-data');
      expect(result2).toBe('concurrent-data');
      expect(result3).toBe('concurrent-data');
    });

    test('should handle factory errors', async () => {
      const factory = vi.fn().mockRejectedValue(new Error('Factory failed'));
      const loader = optimizer.createLazyLoader(factory);

      await expect(loader()).rejects.toThrow('Factory failed');
      expect(factory).toHaveBeenCalledTimes(1);

      // Retry should call factory again
      await expect(loader()).rejects.toThrow('Factory failed');
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Caching', () => {
    test('should cache data when enabled', async () => {
      const factory = vi.fn().mockResolvedValue('cached-data');

      const result1 = await optimizer.cache('key1', factory);
      const result2 = await optimizer.cache('key1', factory);

      expect(result1).toBe('cached-data');
      expect(result2).toBe('cached-data');
      expect(factory).toHaveBeenCalledTimes(1); // Should only be called once
    });

    test('should not cache when disabled', async () => {
      const noCacheOptimizer = new PerformanceOptimizer({ enableCaching: false });
      const factory = vi.fn().mockResolvedValue('no-cache-data');

      const result1 = await noCacheOptimizer.cache('key1', factory);
      const result2 = await noCacheOptimizer.cache('key1', factory);

      expect(result1).toBe('no-cache-data');
      expect(result2).toBe('no-cache-data');
      expect(factory).toHaveBeenCalledTimes(2); // Should be called each time
    });

    test('should handle cache size limits', async () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        await optimizer.cache(`key${i}`, () => Promise.resolve(`data${i}`));
      }

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(10);
      expect(stats.maxSize).toBe(10);

      // Add one more item to trigger eviction
      const factory = vi.fn().mockResolvedValue('new-data');
      await optimizer.cache('new-key', factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(stats.size).toBe(10); // Should still be at max size
    });

    test('should evict least recently used items', async () => {
      // Fill cache with items
      await optimizer.cache('key1', () => Promise.resolve('data1'));
      await optimizer.cache('key2', () => Promise.resolve('data2'));
      await optimizer.cache('key3', () => Promise.resolve('data3'));

      // Access key1 to make it most recently used
      await optimizer.cache('key1', () => Promise.resolve('data1'));

      // Fill cache to trigger eviction
      for (let i = 4; i <= 13; i++) {
        await optimizer.cache(`key${i}`, () => Promise.resolve(`data${i}`));
      }

      // key1 should still be cached (most recently used)
      const result = await optimizer.cache('key1', () => Promise.resolve('new-data1'));
      expect(result).toBe('data1');

      // key2 should be evicted (least recently used)
      const factory = vi.fn().mockResolvedValue('new-data2');
      await optimizer.cache('key2', factory);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should track cache statistics', async () => {
      await optimizer.cache('key1', () => Promise.resolve('data1'));
      await optimizer.cache('key2', () => Promise.resolve('data2'));
      await optimizer.cache('key1', () => Promise.resolve('data1')); // Hit
      await optimizer.cache('key1', () => Promise.resolve('data1')); // Hit

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.totalAccesses).toBe(4);
      expect(stats.hitRate).toBe(50); // 2 hits out of 4 accesses
    });

    test('should clear cache', () => {
      optimizer.clearCache();
      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should start and end performance sessions', () => {
      const initialReport = optimizer.getPerformanceReport();
      expect(initialReport.current).toBeNull();

      optimizer.startSession();
      optimizer.updateSessionMetrics(5, 100);
      optimizer.updateSessionMetrics(3, 50);

      const duringSession = optimizer.getPerformanceReport();
      expect(duringSession.current).toBeDefined();
      expect(duringSession.current?.pagesProcessed).toBe(8);
      expect(duringSession.current?.elementsProcessed).toBe(150);

      const session = optimizer.endSession();
      expect(session).toBeDefined();
      expect(session?.pagesProcessed).toBe(8);
      expect(session?.elementsProcessed).toBe(150);
      expect(session?.duration).toBeGreaterThan(0);

      const finalReport = optimizer.getPerformanceReport();
      expect(finalReport.current).toBeNull();
      expect(finalReport.historical).toHaveLength(1);
    });

    test('should generate performance summary', () => {
      // Add some historical data
      optimizer.startSession();
      optimizer.updateSessionMetrics(10, 100);
      optimizer.endSession();

      optimizer.startSession();
      optimizer.updateSessionMetrics(5, 50);
      optimizer.endSession();

      const report = optimizer.getPerformanceReport();
      expect(report.summary.totalSessions).toBe(2);
      expect(report.summary.totalElementsProcessed).toBe(150);
      expect(report.summary.averageDuration).toBeGreaterThan(0);
      expect(report.summary.averageProcessingSpeed).toBeGreaterThan(0);
    });

    test('should update session metrics correctly', () => {
      optimizer.startSession();

      optimizer.updateSessionMetrics(5); // pages
      optimizer.updateSessionMetrics(undefined, 100); // elements only
      optimizer.updateSessionMetrics(3, 50); // both

      const session = optimizer.endSession();
      expect(session?.pagesProcessed).toBe(8);
      expect(session?.elementsProcessed).toBe(150);
    });
  });

  describe('Memory Management', () => {
    test('should detect memory threshold exceeded', () => {
      optimizer.setMockMemoryUsage(300); // Above threshold of 200
      expect(optimizer['isMemoryThresholdExceeded']()).toBe(true);
    });

    test('should not detect threshold when below limit', () => {
      optimizer.setMockMemoryUsage(150); // Below threshold of 200
      expect(optimizer['isMemoryThresholdExceeded']()).toBe(false);
    });

    test('should optimize memory usage when threshold exceeded', async () => {
      // Fill cache to trigger optimization
      for (let i = 0; i < 6; i++) {
        await optimizer.cache(`key${i}`, () => Promise.resolve(`data${i}`));
      }

      optimizer.setMockMemoryUsage(300); // Trigger threshold
      await optimizer['optimizeMemoryUsage']();

      // Cache should be cleared if over half the max size
      const stats = optimizer.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(5); // Max size / 2
    });
  });

  describe('Optimized Processor', () => {
    test('should create optimized processor with batching and caching', async () => {
      const items = Array.from({ length: 12 }, (_, i) => i);
      const processor = vi.fn().mockImplementation(async (item: number) => item * 2);
      const cacheKeyFn = (item: number) => `item-${item}`;

      const optimizedProcessor = optimizer.createOptimizedProcessor(processor, {
        enableBatching: true,
        enableCaching: true,
        cacheKeyFn
      });

      const results = await optimizedProcessor(items);
      expect(results).toHaveLength(12);
      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    test('should create processor with concurrent processing only', async () => {
      const items = [1, 2, 3, 4];
      const processor = vi.fn().mockImplementation(async (item: number) => item * 2);

      const optimizedProcessor = optimizer.createOptimizedProcessor(processor, {
        enableBatching: false,
        enableCaching: false
      });

      const results = await optimizedProcessor(items);
      expect(results).toEqual([2, 4, 6, 8]);
      expect(processor).toHaveBeenCalledTimes(4);
    });

    test('should use caching when cache key function provided', async () => {
      const items = [1, 2, 3, 1, 2]; // Some duplicates
      const processor = vi.fn().mockImplementation(async (item: number) => item * 2);
      const cacheKeyFn = (item: number) => `item-${item}`;

      const optimizedProcessor = optimizer.createOptimizedProcessor(processor, {
        enableCaching: true,
        cacheKeyFn
      });

      const results = await optimizedProcessor(items);
      expect(results).toHaveLength(5);

      // Should call processor only for unique items
      expect(processor).toHaveBeenCalledTimes(3); // 1, 2, 3
      expect(results).toEqual([2, 4, 6, 2, 4]); // 1, 2, 3, 1, 2 * 2
    });
  });

  describe('Optimization Recommendations', () => {
    test('should provide recommendations for performance issues', async () => {
      // Mock slow performance
      optimizer.startSession();
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow processing
      optimizer.updateSessionMetrics(10, 100);
      optimizer.endSession();

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations).toContain('Performance is well optimized');
    });

    test('should recommend batch size reduction for slow processing', async () => {
      // Mock very slow processing
      optimizer.startSession();
      await new Promise(resolve => setTimeout(resolve, 500)); // Very slow
      optimizer.endSession();

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations.some(r =>
        r.includes('reducing batch size') || r.includes('parallel processing')
      )).toBe(true);
    });

    test('should recommend memory optimization for high memory usage', () => {
      optimizer.setMockMemoryUsage(180); // Close to threshold (80% of 200 = 160)

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations.some(r =>
        r.includes('Memory usage is high')
      )).toBe(true);
    });

    test('should recommend cache improvements for low hit rate', async () => {
      // Create cache with low hit rate
      await optimizer.cache('key1', () => Promise.resolve('data1'));
      await optimizer.cache('key2', () => Promise.resolve('data2'));
      await optimizer.cache('key3', () => Promise.resolve('data3'));
      await optimizer.cache('key4', () => Promise.resolve('data4'));
      await optimizer.cache('key5', () => Promise.resolve('data5'));

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations.some(r =>
        r.includes('Cache hit rate is low')
      )).toBe(true);
    });

    test('should recommend processing optimization for slow speed', async () => {
      optimizer.startSession();
      optimizer.updateSessionMetrics(100, 1000); // Slow processing: 10 elements/sec
      optimizer.endSession();

      const recommendations = optimizer.getOptimizationRecommendations();
      expect(recommendations.some(r =>
        r.includes('Processing speed is slow')
      )).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays gracefully', async () => {
      const processor = vi.fn();

      const batchResults = await optimizer.processBatched([], processor);
      const concurrentResults = await optimizer.processConcurrently([], processor);

      expect(batchResults).toHaveLength(0);
      expect(concurrentResults).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
    });

    test('should handle processor that throws synchronous errors', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(
        optimizer.processConcurrently(items, processor)
      ).rejects.toThrow('Concurrent processing failed');
    });

    test('should handle cache factory that returns promises', async () => {
      const factory = vi.fn().mockResolvedValue('promise-data');

      const result1 = await optimizer.cache('key', factory);
      const result2 = await optimizer.cache('key', factory);

      expect(result1).toBe('promise-data');
      expect(result2).toBe('promise-data');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should handle factory that returns synchronous values', async () => {
      const factory = vi.fn().mockReturnValue('sync-data');

      const result1 = await optimizer.cache('key', factory);
      const result2 = await optimizer.cache('key', factory);

      expect(result1).toBe('sync-data');
      expect(result2).toBe('sync-data');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    test('should handle performance session without updates', () => {
      optimizer.startSession();
      const session = optimizer.endSession();

      expect(session).toBeDefined();
      expect(session?.pagesProcessed).toBe(0);
      expect(session?.elementsProcessed).toBe(0);
      expect(session?.duration).toBeGreaterThanOrEqual(0);
    });

    test('should end session when no active session', () => {
      const session = optimizer.endSession();
      expect(session).toBeNull();
    });
  });

  describe('Semaphore', () => {
    test('should control concurrent access', async () => {
      // Test semaphore implementation through concurrent processing
      const items = Array.from({ length: 4 }, (_, i) => i);
      let activeCount = 0;
      let maxActive = 0;

      const processor = vi.fn().mockImplementation(async (item: number) => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        activeCount--;
        return item;
      });

      // Use processConcurrently which uses Semaphore internally
      const results = await optimizer.processConcurrently(items, processor);

      expect(results).toEqual([0, 1, 2, 3]);
      expect(maxActive).toBeLessThanOrEqual(2); // Limited by maxConcurrency
    });
  });

  describe('Error Handling', () => {
    test('should handle batch processing timeouts', async () => {
      const items = Array.from({ length: 15 }, (_, i) => i);
      const processor = vi.fn().mockImplementation(async (batch: number[]) => {
        if (batch[0] === 10) {
          throw new Error('Timeout error');
        }
        return batch;
      });

      await expect(
        optimizer.processBatched(items, processor)
      ).rejects.toThrow('Batch processing failed at items 10-14');
    });

    test('should handle concurrent processing partial failures', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn()
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('Failed item'))
        .mockResolvedValue(3);

      await expect(
        optimizer.processConcurrently(items, processor)
      ).rejects.toThrow('Concurrent processing failed');
    });

    test('should handle cache factory failures', async () => {
      const factory = vi.fn().mockRejectedValue(new Error('Cache factory failed'));

      await expect(
        optimizer.cache('test', factory)
      ).rejects.toThrow('Cache factory failed');
    });

    test('should handle lazy loading factory failures', async () => {
      const factory = vi.fn().mockRejectedValue(new Error('Lazy load failed'));
      const loader = optimizer.createLazyLoader(factory);

      await expect(loader()).rejects.toThrow('Lazy load failed');
    });
  });
});