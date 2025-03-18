
interface CacheItem<T> {
  value: T;
  expiry: number | null;
}

class MemCache {
  private cache: Map<string, CacheItem<any>>;
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(options: { defaultTTL?: number; cleanupInterval?: number } = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 3600 * 1000; // Default 1 hour in milliseconds
    this.cleanupInterval = null;
    
    // Start automatic cleanup if an interval is provided
    if (options.cleanupInterval) {
      this.startCleanup(options.cleanupInterval);
    }
  }

  /**
   * Set a value in the cache with optional TTL
   * @param key The cache key
   * @param value The value to store
   * @param ttl Time-to-live in milliseconds (optional, uses default if not specified)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = ttl !== undefined 
      ? Date.now() + ttl 
      : (ttl === 0 ? null : Date.now() + this.defaultTTL);
    
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if item has expired
    if (item.expiry !== null && item.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value as T;
  }

  /**
   * Check if a key exists and is not expired
   * @param key The cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
    
    if (item.expiry !== null && item.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   * @param key The cache key to delete
   * @returns True if the key was found and deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the size of the cache
   */
  get size(): number {
    this.cleanup(); // Clean expired items before returning size
    return this.cache.size;
  }

  /**
   * Clean up expired items from the cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry !== null && item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup at the specified interval
   * @param interval Cleanup interval in milliseconds
   */
  startCleanup(interval: number): void {
    this.stopCleanup();
    this.cleanupInterval = setInterval(() => this.cleanup(), interval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export default MemCache;
