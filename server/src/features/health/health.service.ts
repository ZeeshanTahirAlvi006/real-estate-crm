import mongoose from 'mongoose'
import os from 'os'
import { redisClient } from '../../config/redis.js'

export interface DetailedHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptimeSeconds: number
  environment: string
  database: {
    connected: boolean
    readyState: number
    name: string
  }
  cache: {
    connected: boolean
    status: string
  }
  system: {
    memory: {
      rssMb: number
      heapTotalMb: number
      heapUsedMb: number
      externalMb: number
    }
    systemUptimeSeconds: number
    cpuLoadAverage: number[]
  }
}

export const getDetailedSystemHealth = async (): Promise<DetailedHealthStatus> => {
  // 1. MongoDB Health
  const dbState = mongoose.connection.readyState
  const isDbConnected = dbState === 1
  const dbName = mongoose.connection.name || 'proppulse_crm'

  // 2. Redis Health
  let isCacheConnected = false
  let cacheStatus = 'disconnected'
  try {
    if (redisClient && redisClient.status === 'ready') {
      isCacheConnected = true
      cacheStatus = 'ready'
    } else if (redisClient) {
      cacheStatus = redisClient.status
    }
  } catch {
    isCacheConnected = false
    cacheStatus = 'error'
  }

  // 3. Memory metrics in MB
  const mem = process.memoryUsage()
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100

  const memoryMetrics = {
    rssMb: toMb(mem.rss),
    heapTotalMb: toMb(mem.heapTotal),
    heapUsedMb: toMb(mem.heapUsed),
    externalMb: toMb(mem.external),
  }

  // 4. Overall status determination
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (!isDbConnected) {
    status = 'unhealthy'
  } else if (!isCacheConnected) {
    status = 'degraded'
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    database: {
      connected: isDbConnected,
      readyState: dbState,
      name: dbName,
    },
    cache: {
      connected: isCacheConnected,
      status: cacheStatus,
    },
    system: {
      memory: memoryMetrics,
      systemUptimeSeconds: Math.floor(os.uptime()),
      cpuLoadAverage: os.loadavg(),
    },
  }
}
