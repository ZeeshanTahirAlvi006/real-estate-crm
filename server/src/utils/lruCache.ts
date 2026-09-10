/**
 * Production-grade Bounded LRU Cache.
 * Guarantees zero memory leaks by enforcing a strict maximum size and automatic TTL eviction.
 */
export class BoundedLruCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private readonly maxSize: number
  private readonly defaultTtlMs: number

  constructor(maxSize: number = 1000, defaultTtlSeconds: number = 60) {
    this.maxSize = maxSize
    this.defaultTtlMs = defaultTtlSeconds * 1000

    // Sweep expired keys every 2 minutes
    const interval = setInterval(() => this.purgeExpired(), 120_000)
    if (interval.unref) {
      interval.unref() // Does not keep Node event loop alive if everything else exits
    }
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }

    // Refresh LRU order (delete & re-insert moves to end of Map iteration)
    this.cache.delete(key)
    this.cache.set(key, item)
    return item.value
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest item (first entry in Map iterator)
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    const ttl = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTtlMs
    this.cache.set(key, { value, expiry: Date.now() + ttl })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): IterableIterator<string> {
    return this.cache.keys()
  }

  get size(): number {
    return this.cache.size
  }

  private purgeExpired(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}
