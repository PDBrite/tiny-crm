import { PrismaClient } from '@prisma/client'

// Database configuration for different environments
export const getDatabaseUrl = (): string => {
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  switch (nodeEnv) {
    case 'test':
      return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ''
    case 'production':
      return process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL || ''
    case 'development':
    default:
      return process.env.DATABASE_URL || ''
  }
}

// Create Prisma client with the appropriate database URL
export const createPrismaClient = (): PrismaClient => {
  const databaseUrl = getDatabaseUrl()
  
  if (!databaseUrl) {
    throw new Error(`Database URL not found for environment: ${process.env.NODE_ENV}`)
  }
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

// Environment-specific database utilities
export const dbConfig = {
  development: {
    url: process.env.DATABASE_URL,
    description: 'Local Docker PostgreSQL'
  },
  test: {
    url: process.env.TEST_DATABASE_URL,
    description: 'Neon Test Database'
  },
  production: {
    url: process.env.PRODUCTION_DATABASE_URL,
    description: 'Neon Production Database'
  }
}

// Validate database configuration
export const validateDatabaseConfig = (): void => {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const config = dbConfig[nodeEnv as keyof typeof dbConfig]
  
  if (!config?.url) {
    throw new Error(`Database URL not configured for ${nodeEnv} environment`)
  }
  

} 