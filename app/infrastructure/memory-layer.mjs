
/**
 * Base memory cache layer implementation
 */
export class MemCacheLayer extends Map {
  constructor() {
    super();
  }

  // Extended methods
  entries() {
    return Array.from(super.entries());
  }
  
  keys() {
    return Array.from(super.keys());
  }
  
  values() {
    return Array.from(super.values());
  }
  
  has(key) {
    return super.has(key);
  }
  
  delete(key) {
    return super.delete(key);
  }
  
  clear() {
    return super.clear();
  }
}
