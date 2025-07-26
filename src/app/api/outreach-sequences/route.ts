import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CompanyType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const companyParam = searchParams.get('company')

    // Validate user has access to the requested company
    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []
    
    if (!companyParam) {
      return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 })
    }
    
    // Helper function to convert string to CompanyType
    const getCompanyType = (company: string): CompanyType => {
      // Handle case insensitive matching
      const normalized = company.toLowerCase()
      if (normalized === 'avalern') return CompanyType.Avalern
      if (normalized === 'craftycode') return CompanyType.CraftyCode
      // Default case - should not happen with proper validation
      return CompanyType.Avalern
    }
    
    const companyType = getCompanyType(companyParam)
    
    // Check if user has access to this company
    if (userRole === 'member' && !allowedCompanies.includes(companyParam.toLowerCase())) {
      return NextResponse.json({ error: 'You do not have access to this company' }, { status: 403 })
    }

    // Fetch outreach sequences with step counts
    const sequences = await prisma.outreachSequence.findMany({
      where: {
        company: companyType
      },
      include: {
        _count: {
          select: {
            steps: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ sequences })
  } catch (error) {
    console.error('Error fetching outreach sequences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name, company, description, steps } = body

    // Validate required fields
    if (!name || !company) {
      return NextResponse.json(
        { error: 'Name and company are required' },
        { status: 400 }
      )
    }

    // Helper function to convert string to CompanyType
    const getCompanyType = (company: string): CompanyType => {
      // Handle case insensitive matching
      const normalized = company.toLowerCase()
      if (normalized === 'avalern') return CompanyType.Avalern
      if (normalized === 'craftycode') return CompanyType.CraftyCode
      // Default case - should not happen with proper validation
      return CompanyType.Avalern
    }
    
    const companyType = getCompanyType(company)

    // Check if user has access to this company
    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []
    
    if (userRole === 'member' && !allowedCompanies.includes(company.toLowerCase())) {
      return NextResponse.json(
        { error: 'You do not have access to create sequences for this company' },
        { status: 403 }
      )
    }

    // Create sequence using Prisma transaction to ensure steps are created together with the sequence
    const sequence = await prisma.$transaction(async (tx) => {
      // Create the sequence first
      const newSequence = await tx.outreachSequence.create({
        data: {
          name,
          company: companyType,
          description
        }
      })

      // If steps are provided, create them
      if (steps && Array.isArray(steps) && steps.length > 0) {
        await Promise.all(steps.map(async (step: any, index: number) => {
          await tx.outreachStep.create({
            data: {
              sequenceId: newSequence.id,
              stepOrder: index + 1,
              type: step.type,
              name: step.name,
              contentLink: step.contentLink,
              dayOffset: step.dayOffset || index * 2, // Default to 2 days apart if not specified
              daysAfterPrevious: index === 0 ? null : 2 // Default to 2 days after previous
            }
          })
        }))
      }

      // Return the created sequence with its steps
      return await tx.outreachSequence.findUnique({
        where: { id: newSequence.id },
        include: {
          steps: {
            orderBy: {
              stepOrder: 'asc'
            }
          }
        }
      })
    })

    return NextResponse.json({ sequence }, { status: 201 })
  } catch (error) {
    console.error('Error creating outreach sequence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 