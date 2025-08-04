import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        status: 401
      }, { status: 401 })
    }
    
    // Test database connection
    const testData = await prisma.district.count()
    
    // Test district query
    const districts = await prisma.district.findMany({
      select: {
        id: true,
        name: true,
        county: true,
        state: true
      },
      take: 5
    })
    
    return NextResponse.json({
      user: {
        email: session.user?.email,
        role: session.user?.role,
        allowedCompanies: session.user?.allowedCompanies
      },
      dbTest: {
        success: true,
        error: null,
        data: { count: testData }
      },
      districtsTest: {
        success: true,
        error: null,
        count: districts.length,
        data: districts
      }
    })
  } catch (error) {
    console.error('Error in test-company API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 