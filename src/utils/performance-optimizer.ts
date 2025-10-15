/**
 * Performance optimization utilities for large test suites
 */

export interface PerformanceConfig {
  batchSize: number;
  maxConcurrency: number;
  timeoutMs: number;
  memoryThresholdMB: number;
  enableCaching: boolean;
  cacheMaxSize: number;
  enableLazyLoading: boolean;
  enableCompression: boolean;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsageMB: number;
  pagesProcessed: number;
  elementsProcessed: number;
  cacheHitRate: number;
  averageProcessingTime: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Performance optimization manager
 */
export class PerformanceOptimizer {
  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    batchSize: 10,
    maxConcurrency: 3,
    timeoutMs: 30000,
    memoryThresholdMB: 512,
    enableCaching: true,
    cacheMaxSize: 1000,
    enableLazyLoading: true,
    enableCompression: false
  };

  private config: PerformanceConfig;
  private elementCache: Map<string, CacheEntry<any>> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private currentSession: PerformanceMetrics | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...PerformanceOptimizer.DEFAULT_CONFIG, ...config };
    this.setupMemoryMonitoring();
  }

  /**
   * Process items in batches to control memory usage
   */
  async processBatched<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i += this.config.batchSize) {
      const batch = items.slice(i, i + this.config.batchSize);

      // Check memory before processing batch
      if (this.isMemoryThresholdExceeded()) {
        await this.optimizeMemoryUsage();
      }

      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);

        if (onProgress) {
          onProgress(Math.min(i + this.config.batchSize, total), total);
        }

        // Allow event loop to process other tasks
        await this.yield();
      } catch (error) {
        throw new Error(`Batch processing failed at items ${i}-${i + batch.length}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Process items with controlled concurrency
   */
  async processConcurrently<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const total = items.length;
    const semaphore = new Semaphore(this.config.maxConcurrency);

    const processItem = async (item: T, index: number): Promise<R> => {
      await semaphore.acquire();
      try {
        const result = await processor(item);

        if (onProgress) {
          onProgress(index + 1, total);
        }

        return result;
      } finally {
        semaphore.release();
      }
    };

    const promises = items.map((item, index) => processItem(item, index));
    const settledResults = await Promise.allSettled(promises);

    // Collect successful results and rethrow failures
    const failures: any[] = [];
    settledResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        failures.push({ index, error: result.reason });
      }
    });

    if (failures.length > 0) {
      throw new Error(
        `Concurrent processing failed for ${failures.length} items. ` +
        `First error: ${failures[0].error.message}`
      );
    }

    return results;
  }

  /**
   * Lazy loading utility for expensive operations
   */
  createLazyLoader<T>(factory: () => Promise<T>): () => Promise<T> {
    let loaded = false;
    let value: T | null = null;
    let loadingPromise: Promise<T> | null = null;

    return async (): Promise<T> => {
      if (loaded && value !== null) {
        return value;
      }

      if (loadingPromise) {
        return loadingPromise;
      }

      loadingPromise = factory();
      try {
        value = await loadingPromise;
        loaded = true;
        return value;
      } finally {
        loadingPromise = null;
      }
    };
  }

  /**
   * Memory-efficient caching with LRU eviction
   */
  cache<T>(key: string, factory: () => Promise<T> | T): Promise<T> {
    if (!this.config.enableCaching) {
      return Promise.resolve(factory());
    }

    const existing = this.elementCache.get(key);
    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = Date.now();
      return Promise.resolve(existing.data);
    }

    // Check cache size limit
    if (this.elementCache.size >= this.config.cacheMaxSize) {
      this.evictLeastRecentlyUsed();
    }

    return new Promise(async (resolve, reject) => {
      try {
        const data = await factory();
        this.elementCache.set(key, {
          data,
          timestamp: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now()
        });
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.elementCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.elementCache.delete(oldestKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.elementCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccesses: number;
  } {
    let totalAccesses = 0;
    let cacheHits = 0;

    for (const entry of this.elementCache.values()) {
      totalAccesses += entry.accessCount;
      if (entry.accessCount > 1) {
        cacheHits += entry.accessCount - 1;
      }
    }

    return {
      size: this.elementCache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: totalAccesses > 0 ? (cacheHits / totalAccesses) * 100 : 0,
      totalAccesses
    };
  }

  /**
   * Start performance monitoring session
   */
  startSession(): void {
    this.currentSession = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryUsageMB: this.getCurrentMemoryUsage(),
      pagesProcessed: 0,
      elementsProcessed: 0,
      cacheHitRate: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * End performance monitoring session
   */
  endSession(): PerformanceMetrics | null {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.memoryUsageMB = this.getCurrentMemoryUsage();
    this.currentSession.cacheHitRate = this.getCacheStats().hitRate;

    const session = { ...this.currentSession };
    this.metrics.push(session);
    this.currentSession = null;

    return session;
  }

  /**
   * Update session metrics
   */
  updateSessionMetrics(pages?: number, elements?: number): void {
    if (this.currentSession) {
      if (pages !== undefined) {
        this.currentSession.pagesProcessed += pages;
      }
      if (elements !== undefined) {
        this.currentSession.elementsProcessed += elements;
      }
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    current: PerformanceMetrics | null;
    historical: PerformanceMetrics[];
    summary: {
      totalSessions: number;
      averageDuration: number;
      averageMemoryUsage: number;
      totalElementsProcessed: number;
      averageProcessingSpeed: number;
    };
  } {
    const summary = {
      totalSessions: this.metrics.length,
      averageDuration: 0,
      averageMemoryUsage: 0,
      totalElementsProcessed: 0,
      averageProcessingSpeed: 0
    };

    if (this.metrics.length > 0) {
      summary.averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
      summary.averageMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsageMB, 0) / this.metrics.length;
      summary.totalElementsProcessed = this.metrics.reduce((sum, m) => sum + m.elementsProcessed, 0);

      if (summary.totalSessions > 0) {
        summary.averageProcessingSpeed = summary.totalElementsProcessed /
          (this.metrics.reduce((sum, m) => sum + m.duration, 0) / 1000); // elements per second
      }
    }

    return {
      current: this.currentSession,
      historical: [...this.metrics],
      summary
    };
  }

  /**
   * Check if memory threshold is exceeded
   */
  private isMemoryThresholdExceeded(): boolean {
    const currentMemory = this.getCurrentMemoryUsage();
    return currentMemory > this.config.memoryThresholdMB;
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemoryUsage(): Promise<void> {
    // Clear cache if it's getting large
    if (this.elementCache.size > this.config.cacheMaxSize / 2) {
      this.clearCache();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Yield to allow event loop to process
    await this.yield();
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof process !== 'undefined') {
      setInterval(() => {
        if (this.isMemoryThresholdExceeded()) {
          console.warn('⚠️ Memory threshold exceeded, optimizing...');
          this.optimizeMemoryUsage();
        }
      }, 5000); // Check every 5 seconds
    }
  }

  /**
   * Yield control to event loop
   */
  private async yield(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Create optimized processor for large datasets
   */
  createOptimizedProcessor<T, R>(
    processor: (item: T) => Promise<R>,
    options: {
      enableBatching?: boolean;
      enableCaching?: boolean;
      cacheKeyFn?: (item: T) => string;
    } = {}
  ): (items: T[]) => Promise<R[]> {
    return async (items: T[]): Promise<R[]> => {
      const {
        enableBatching = true,
        enableCaching = this.config.enableCaching,
        cacheKeyFn
      } = options;

      if (enableCaching && cacheKeyFn) {
        // Use caching for individual items
        const cachedProcessor = async (item: T): Promise<R> => {
          const key = cacheKeyFn(item);
          return this.cache(key, () => processor(item));
        };

        if (enableBatching && items.length > this.config.batchSize) {
          return this.processBatched(items, async (batch) => {
            return this.processConcurrently(batch, cachedProcessor);
          });
        } else {
          return this.processConcurrently(items, cachedProcessor);
        }
      }

      if (enableBatching && items.length > this.config.batchSize) {
        return this.processBatched(items, async (batch) => {
          return this.processConcurrently(batch, processor);
        });
      }

      return this.processConcurrently(items, processor);
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getPerformanceReport().summary;

    if (stats.averageDuration > 30000) {
      recommendations.push('Consider reducing batch size or enabling parallel processing');
    }

    if (stats.averageMemoryUsage > this.config.memoryThresholdMB * 0.8) {
      recommendations.push('Memory usage is high, consider enabling compression or reducing batch size');
    }

    const cacheStats = this.getCacheStats();
    if (cacheStats.hitRate < 50 && this.config.enableCaching) {
      recommendations.push('Cache hit rate is low, review caching strategy');
    }

    if (stats.averageProcessingSpeed < 10) {
      recommendations.push('Processing speed is slow, consider optimizing element discovery logic');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is well optimized');
    }

    return recommendations;
  }
}

/**
 * Simple semaphore implementation for concurrency control
 */
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

/**
 * Performance optimization presets
 */
export const PerformancePresets = {
  /**
   * Optimized for CI/CD environments
   */
  ci: {
    batchSize: 5,
    maxConcurrency: 2,
    timeoutMs: 60000,
    memoryThresholdMB: 256,
    enableCaching: true,
    cacheMaxSize: 500,
    enableLazyLoading: false,
    enableCompression: true
  },

  /**
   * Optimized for local development
   */
  development: {
    batchSize: 10,
    maxConcurrency: 3,
    timeoutMs: 30000,
    memoryThresholdMB: 512,
    enableCaching: true,
    cacheMaxSize: 1000,
    enableLazyLoading: true,
    enableCompression: false
  },

  /**
   * Optimized for large test suites
   */
  large: {
    batchSize: 20,
    maxConcurrency: 4,
    timeoutMs: 120000,
    memoryThresholdMB: 1024,
    enableCaching: true,
    cacheMaxSize: 2000,
    enableLazyLoading: true,
    enableCompression: true
  },

  /**
   * Minimal resource usage
   */
  minimal: {
    batchSize: 3,
    maxConcurrency: 1,
    timeoutMs: 15000,
    memoryThresholdMB: 128,
    enableCaching: false,
    cacheMaxSize: 100,
    enableLazyLoading: false,
    enableCompression: false
  }
};