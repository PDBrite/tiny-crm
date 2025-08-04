import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { UserRoleType } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication (optional)
    const session = await getServerSession(authOptions)
    
    // Get the sequence ID from the params
    const { id: sequenceId } = await params
    
    if (!sequenceId) {
      return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 })
    }

    // Fetch sequence with steps
    const sequence = await prisma.outreachSequence.findUnique({
      where: {
        id: sequenceId
      },
      include: {
        steps: {
          orderBy: {
            stepOrder: 'asc'
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Check if user has access to this sequence's company (only if authenticated)
    if (session?.user) {
      const userRole = session.user.role
      const allowedCompanies = session.user.allowedCompanies || []
      const companyName = sequence.company.toString().toLowerCase()
      
      if (userRole === UserRoleType.member && !allowedCompanies.includes(companyName)) {
        return NextResponse.json({ error: 'You do not have access to this sequence' }, { status: 403 })
      }
    }

    return NextResponse.json({ sequence })
  } catch (error) {
    console.error('Error fetching outreach sequence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 