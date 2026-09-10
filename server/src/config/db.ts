import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

// MongoDB connection options
const mongooseOptions: mongoose.ConnectOptions = {
  autoIndex: env.NODE_ENV !== 'production',
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}

// Connect to MongoDB with auto-retry logic
export const connectDB = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully')
    })

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...')
    })

    await mongoose.connect(env.MONGODB_URI, mongooseOptions)
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error)
    // Don't crash immediately in dev to allow debugging
    if (env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}

// Graceful database disconnection
export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect()
  logger.info('MongoDB disconnected through app termination')
}
