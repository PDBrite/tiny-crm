import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    // Test database connection
    let dbStatus = 'unknown'
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = `error: ${error instanceof Error ? error.message : String(error)}`
    }
    
    // Get environment info (without sensitive data)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      dbStatus
    }
    
    return NextResponse.json({
      env: envInfo,
      session: session ? { 
        user: { 
          id: session.user?.id, 
          email: session.user?.email,
          role: session.user?.role 
        } 
      } : null
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug endpoint error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 