class MemCache {
    constructor(options = {}) {
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
    set(key, value, ttl) {
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
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return undefined;
        }
        // Check if item has expired
        if (item.expiry !== null && item.expiry < Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return item.value;
    }
    /**
     * Check if a key exists and is not expired
     * @param key The cache key
     * @returns True if the key exists and is not expired
     */
    has(key) {
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
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all items from the cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get the size of the cache
     */
    get size() {
        this.cleanup(); // Clean expired items before returning size
        return this.cache.size;
    }
    /**
     * Clean up expired items from the cache
     */
    cleanup() {
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
    startCleanup(interval) {
        this.stopCleanup();
        this.cleanupInterval = setInterval(() => this.cleanup(), interval);
    }
    /**
     * Stop automatic cleanup
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
export default MemCache;
//# sourceMappingURL=memcache.js.map