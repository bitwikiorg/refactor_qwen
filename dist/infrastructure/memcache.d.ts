declare class MemCache {
    private cache;
    private readonly defaultTTL;
    private cleanupInterval;
    constructor(options?: {
        defaultTTL?: number;
        cleanupInterval?: number;
    });
    /**
     * Set a value in the cache with optional TTL
     * @param key The cache key
     * @param value The value to store
     * @param ttl Time-to-live in milliseconds (optional, uses default if not specified)
     */
    set<T>(key: string, value: T, ttl?: number): void;
    /**
     * Get a value from the cache
     * @param key The cache key
     * @returns The cached value or undefined if not found or expired
     */
    get<T>(key: string): T | undefined;
    /**
     * Check if a key exists and is not expired
     * @param key The cache key
     * @returns True if the key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete a key from the cache
     * @param key The cache key to delete
     * @returns True if the key was found and deleted
     */
    delete(key: string): boolean;
    /**
     * Clear all items from the cache
     */
    clear(): void;
    /**
     * Get the size of the cache
     */
    get size(): number;
    /**
     * Clean up expired items from the cache
     */
    cleanup(): void;
    /**
     * Start automatic cleanup at the specified interval
     * @param interval Cleanup interval in milliseconds
     */
    startCleanup(interval: number): void;
    /**
     * Stop automatic cleanup
     */
    stopCleanup(): void;
}
export default MemCache;
