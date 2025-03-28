
import { MemCacheLayer } from './memory-layer.mjs';

export const DEFAULT_TTL = 3600; // seconds
const MAX_CAPACITY_THRESHOLD = 85; // percentage

class NeuroMemCache extends MemCacheLayer {
  #capacityThreshold;
  
  constructor(options = {}) {
    super();
    this.#capacityThreshold = options.capacityThreshold || MAX_CAPACITY_THRESHOLD;
    this._capacity = options.capacity || 1000;
    this.size = 0;
  }
  
  get(key) {
    const item = super.get(key);
    if (!item) return undefined;
    
    // Check expiration
    if (item.metadata.expires && new Date() > item.metadata.expires) {
      super.delete(key);
      return undefined;
    }
    
    // Update access metadata
    item.metadata.lastAccessed = new Date();
    return item.value;
  }
  
  set(key, value, options = {}) {
    try {
      // Check capacity and evict if needed
      if (this.isFull()) {
        this.deleteLeastUsed();
      }
      
      // Format the entry with metadata
      const entry = {
        value,
        metadata: {
          created: new Date(),
          lastAccessed: new Date(),
          expires: options.ttl ? this.computeExpiration(options.ttl * 1000) : null
        }
      };
      
      super.set(key, entry);
      this.size++;
      return true;
    } catch (err) {
      console.error('Caching failed:', err.message, key?.toString?.());
      return false;
    }
  }
  
  isFull() {
    return ((Math.round((this.size / this._capacity) * 1e4) / 1e2) >= this.#capacityThreshold);
  }
  
  // Protected utility methods
  computeExpiration(durationMs = DEFAULT_TTL * 1e3) {
    return new Date(Date.now() + durationMs);
  }
  
  deleteLeastUsed() {
    const entries = this.entries();
    let oldestEntry = null;
    let minAccessTime = Number.POSITIVE_INFINITY;
    
    for (const [k, v] of entries) {
      const lastUse = v.metadata.lastAccessed.getTime();
      if (lastUse < minAccessTime) {
        minAccessTime = lastUse;
        oldestEntry = [k, v];
      }
    }
    
    if (oldestEntry) {
      this.size--;
      return oldestEntry[0] && super.delete(oldestEntry[0]);
    } else {
      return undefined;
    }
  }
}

export { NeuroMemCache, MemCacheLayer };
