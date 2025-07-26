import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CampaignStatusType, CompanyType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const companyParam = searchParams.get('company')
    const statusParam = searchParams.get('status')

    // Build the where clause based on permissions and filters
    let where: any = {}

    // Helper function to convert string to CompanyType
    const getCompanyType = (company: string): CompanyType => {
      // Handle case insensitive matching
      const normalized = company.toLowerCase()
      if (normalized === 'avalern') return CompanyType.Avalern
      if (normalized === 'craftycode') return CompanyType.CraftyCode
      // Default case - should not happen with proper validation
      return CompanyType.Avalern
    }

    // Filter by company based on user role and allowed companies
    if (userRole === 'member') {
      // Member users can only see campaigns for their allowed companies
      where.company = {
        in: allowedCompanies.map(c => getCompanyType(c))
      }
    } else if (companyParam) {
      // Admin users can filter by company
      where.company = getCompanyType(companyParam)
    }

    // Filter by status if provided
    if (statusParam) {
      where.status = statusParam as CampaignStatusType
    }

    // Get campaigns from database using Prisma
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        outreachSequence: {
          select: {
            id: true,
            name: true,
            description: true,
            steps: {
              select: {
                id: true,
                stepOrder: true,
                type: true,
                dayOffset: true
              },
              orderBy: {
                stepOrder: 'asc'
              }
            }
          }
        },
        _count: {
          select: {
            leads: true,
            districtContacts: true
          }
        },
        createdBy: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the expected format
    const transformedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      company: campaign.company,
      description: campaign.description,
      start_date: campaign.startDate,
      end_date: campaign.endDate,
      created_at: campaign.createdAt,
      status: campaign.status,
      outreach_sequence: campaign.outreachSequence,
      leads_count: campaign._count.leads,
      district_contacts_count: campaign._count.districtContacts,
      instantly_campaign_id: campaign.instantlyCampaignId,
      created_by: campaign.createdBy ? {
        id: campaign.createdBy.id,
        email: campaign.createdBy.email,
        name: `${campaign.createdBy.firstName || ''} ${campaign.createdBy.lastName || ''}`.trim() || campaign.createdBy.email,
        role: campaign.createdBy.role
      } : null
    }))

    return NextResponse.json({ campaigns: transformedCampaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    // Parse request body
    const body = await request.json()
    const { 
      name, 
      company, 
      description, 
      startDate, 
      endDate, 
      outreachSequenceId,
      instantlyCampaignId,
      status
    } = body

    // Validate required fields
    if (!name || !company) {
      return NextResponse.json(
        { error: 'Name and company are required' },
        { status: 400 }
      )
    }

    // Check if user has permission to create campaigns for this company
    const companyLower = company.toLowerCase()
    if (userRole === 'member' && !allowedCompanies.includes(companyLower)) {
      return NextResponse.json(
        { error: 'You do not have permission to create campaigns for this company' },
        { status: 403 }
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

    // Create campaign using Prisma
    const campaign = await prisma.campaign.create({
      data: {
        name,
        company: getCompanyType(company),
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        outreachSequenceId,
        instantlyCampaignId,
        status: status as CampaignStatusType || 'draft',
        createdById: userId
      },
      include: {
        outreachSequence: {
          include: {
            steps: {
              orderBy: {
                stepOrder: 'asc'
              }
            }
          }
        },
        createdBy: true
      }
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 