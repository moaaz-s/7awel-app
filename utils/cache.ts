// utils/cache.ts
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // seconds
}

export class Cache {
  private storage = new Map<string, CacheItem<any>>();
  
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.storage.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000 // Convert to milliseconds
    });
  }
  
  get<T>(key: string): T | null {
    const item = this.storage.get(key);
    if (!item) return null;
    
    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;
    
    if (isExpired) {
      this.storage.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  clear(key?: string): void {
    if (key) {
      this.storage.delete(key);
    } else {
      this.storage.clear();
    }
  }
  
  has(key: string): boolean {
    const item = this.get(key);
    return item !== null;
  }
}

// Singleton instance
export const memoryCache = new Cache();
