import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

// MongoDB connection options (PERF-M-003: explicit maxPoolSize >= 100 floor)
const mongooseOptions: mongoose.ConnectOptions = {
  autoIndex: env.NODE_ENV !== 'production',
  maxPoolSize: 100,
  minPoolSize: env.NODE_ENV === 'production' ? 10 : 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 15000

// Normalize unknown thrown values so loggers keep the stack trace
const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(String(err))

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Event listeners are registered once at module load, so calling
// connectDB() multiple times (tests, hot reload) never duplicates them
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established successfully')
})

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB connection re-established')
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. The driver will attempt to reconnect...')
})

mongoose.connection.on('error', (err) => {
  const error = toError(err)
  logger.error(`MongoDB connection error: ${error.message}`, {
    stack: error.stack,
  })
})

//Connects to MongoDB, retrying with exponential backoff.
//Throws if all attempts fail; the caller decides whether to exit.

export const connectDB = async (): Promise<void> => {
  // Already connected (1) or connecting (2): nothing to do
  if (
    mongoose.connection.readyState === 1 ||
    mongoose.connection.readyState === 2
  ) {
    return
  }

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, mongooseOptions)
      return
    } catch (err) {
      lastError = toError(err)
      logger.error(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`,
        { stack: lastError.stack }
      )

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS)
        logger.warn(`Retrying MongoDB connection in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw new Error(
    `Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${lastError?.message}`
  )
}

//Closes all pooled connections. Safe to call more than once.

export const disconnectDB = async (): Promise<void> => {
  // 0 = disconnected
  if (mongoose.connection.readyState === 0) {
    return
  }

  try {
    await mongoose.disconnect()
    logger.info('MongoDB disconnected through app termination')
  } catch (err) {
    const error = toError(err)
    logger.error(`Error while disconnecting MongoDB: ${error.message}`, {
      stack: error.stack,
    })
  }
}