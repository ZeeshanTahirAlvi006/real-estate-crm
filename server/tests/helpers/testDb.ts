import mongoose from 'mongoose'
import { env } from '../../src/config/env.js'

const TEST_DB_URI = process.env.MONGODB_TEST_URI || env.MONGODB_URI || 'mongodb://localhost:27017/proppulse_test'

export const connectTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(TEST_DB_URI)
}

export const clearTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}

export const disconnectTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
}
