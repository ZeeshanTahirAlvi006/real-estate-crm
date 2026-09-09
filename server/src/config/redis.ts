import { Redis } from 'ioredis'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

// In-memory fallback map when Redis is unreachable
const inMemoryCache = new Map<string, { value: string; expiry: number }>()

let redisClient: Redis | null = null
let isRedisConnected = false

// Initialize Redis client with automatic fallback
export const initRedis = (): void => {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('Redis unreachable. In-memory fallback cache mode activated.')
          return null // stop retrying
        }
        return Math.min(times * 100, 2000)
      },
    })

    redisClient.on('connect', () => {
      isRedisConnected = true
      logger.info('Redis connection established successfully')
    })

    redisClient.on('error', (err) => {
      isRedisConnected = false
      logger.warn(`Redis error (${err.message}). Using in-memory cache.`)
    })
  } catch (error) {
    logger.warn('Redis initialization failed. Using in-memory fallback.')
    isRedisConnected = false
  }
}

// Unified Cache Get Operation
export const cacheGet = async (key: string): Promise<string | null> => {
  if (isRedisConnected && redisClient) {
    try {
      return await redisClient.get(key)
    } catch {
      // Fallback to in-memory on failure
    }
  }
  const item = inMemoryCache.get(key)
  if (!item) return null
  if (Date.now() > item.expiry) {
    inMemoryCache.delete(key)
    return null
  }
  return item.value
}

// Unified Cache Set Operation with TTL (seconds)
export const cacheSet = async (key: string, value: string, ttlSeconds: number = 300): Promise<void> => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, value, 'EX', ttlSeconds)
      return
    } catch {
      // Fallback to in-memory on failure
    }
  }
  inMemoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 })
}

// Unified Cache Delete Operation
export const cacheDelete = async (key: string): Promise<void> => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key)
    } catch {
      // Fallback to in-memory on failure
    }
  }
  inMemoryCache.delete(key)
}

// Invalidate Cache by Prefix / Pattern
export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern)
      if (keys.length > 0) {
        await redisClient.del(...keys)
      }
    } catch {
      // Fallback to in-memory
    }
  }
  const regex = new RegExp(`^${pattern.replace('*', '.*')}`)
  for (const key of inMemoryCache.keys()) {
    if (regex.test(key)) {
      inMemoryCache.delete(key)
    }
  }
}

export const getRedisClient = (): Redis | null => redisClient

export { redisClient }

