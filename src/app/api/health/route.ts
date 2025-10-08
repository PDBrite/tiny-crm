import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime
    
    logger.info('Health check passed', {
      endpoint: request.url,
      responseTime,
      status: 'healthy'
    })
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0'
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logger.error('Health check failed', error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: request.url,
      responseTime,
      status: 'unhealthy'
    })
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
} 