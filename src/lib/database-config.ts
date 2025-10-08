import { PrismaClient } from '@prisma/client'

// Database configuration for local development
export const getDatabaseUrl = (): string => {
  return process.env.DATABASE_URL || ''
}

// Create Prisma client with the database URL
export const createPrismaClient = (): PrismaClient => {
  const databaseUrl = getDatabaseUrl()
  
  if (!databaseUrl) {
    throw new Error('Database URL not found. Please set DATABASE_URL in your .env file')
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// Database configuration
export const dbConfig = {
  url: process.env.DATABASE_URL,
  description: 'Local Docker PostgreSQL'
}

// Validate database configuration
export const validateDatabaseConfig = (): void => {
  if (!dbConfig.url) {
    throw new Error('Database URL not configured. Please set DATABASE_URL in your .env file')
  }
}