import { beforeEach, beforeAll, afterAll, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// MongoDB Memory Server instance
let mongoServer: MongoMemoryServer

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()
  await mongoose.connect(uri)
})

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

// Clear database and models between tests
beforeEach(async () => {
  if (mongoose.connection) {
    // Clear all collections
    const collections = mongoose.connection.collections
    for (const key in collections) {
      await collections[key].deleteMany({})
    }

    // Clear model cache
    const modelNames = Object.keys(mongoose.connection.models)
    for (const modelName of modelNames) {
      try {
        mongoose.deleteModel(modelName)
      } catch {
        // Model might not exist in connection
      }
    }
  }
})

// Set test environment
process.env.NODE_ENV = 'test'

// Mock environment variables
vi.mock('@we-grow/env/server', () => ({
  env: {
    DATABASE_URL: 'mongodb://localhost:27017/test',
    BETTER_AUTH_SECRET: 'test-secret-key-at-least-32-chars',
    BETTER_AUTH_URL: 'http://localhost:3000',
    CORS_ORIGIN: 'http://localhost:3000',
    VAPID_PUBLIC_KEY: 'test-vapid-public-key',
    VAPID_PRIVATE_KEY: 'test-vapid-private-key',
  },
}))
