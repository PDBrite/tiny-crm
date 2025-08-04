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
    const createdByParam = searchParams.get('createdBy')

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

    // Filter by created user if provided
    if (createdByParam) {
      where.createdById = createdByParam
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
    console.log('Campaign creation request body:', body)
    
    const { 
      name, 
      company, 
      description, 
      startDate, 
      endDate, 
      start_date, // Handle both camelCase and snake_case
      end_date,   // Handle both camelCase and snake_case
      outreachSequenceId,
      instantlyCampaignId,
      instantly_campaign_id, // Handle both camelCase and snake_case
      status
    } = body

    // Validate required fields
    if (!name || !company) {
      console.log('Validation failed: missing name or company', { name, company })
      return NextResponse.json(
        { error: 'Name and company are required' },
        { status: 400 }
      )
    }

    // Check if user has permission to create campaigns for this company
    const companyLower = company.toLowerCase()
    if (userRole === 'member' && !allowedCompanies.includes(companyLower)) {
      console.log('Permission denied: user cannot create campaigns for this company', { userRole, allowedCompanies, company })
      return NextResponse.json(
        { error: 'You do not have permission to create campaigns for this company' },
        { status: 403 }
      )
    }

    // Validate outreach sequence exists if provided
    if (outreachSequenceId) {
      try {
        const outreachSequence = await prisma.outreachSequence.findUnique({
          where: { id: outreachSequenceId }
        })
        
        if (!outreachSequence) {
          console.log('Outreach sequence not found:', outreachSequenceId)
          return NextResponse.json(
            { error: 'Outreach sequence not found' },
            { status: 400 }
          )
        }
        
        console.log('Outreach sequence found:', outreachSequence.name)
      } catch (error) {
        console.error('Error validating outreach sequence:', error)
        return NextResponse.json(
          { error: 'Invalid outreach sequence ID' },
          { status: 400 }
        )
      }
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

    console.log('Creating campaign with data:', {
      name,
      company: getCompanyType(company),
      description,
      startDate: startDate || start_date,
      endDate: endDate || end_date,
      outreachSequenceId,
      instantlyCampaignId: instantlyCampaignId || instantly_campaign_id,
      status: status || 'complete',
      createdById: userId
    })

    // Create campaign using Prisma
    const campaign = await prisma.campaign.create({
      data: {
        name,
        company: getCompanyType(company),
        description,
        startDate: (startDate || start_date) ? new Date(startDate || start_date) : null,
        endDate: (endDate || end_date) ? new Date(endDate || end_date) : null,
        outreachSequenceId,
        instantlyCampaignId: instantlyCampaignId || instantly_campaign_id,
        status: status as CampaignStatusType || 'complete',
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

    console.log('Campaign created successfully:', campaign.id)
    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    
    // Provide more detailed error information
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, details: error.stack },
        { status: 500 }
      )
    } else {
      return NextResponse.json(
        { error: 'Internal server error', details: String(error) },
        { status: 500 }
      )
    }
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    // Parse request body
    const body = await request.json()
    const { 
      id,
      name, 
      company, 
      description, 
      startDate, 
      endDate, 
      start_date, // Handle both camelCase and snake_case
      end_date,   // Handle both camelCase and snake_case
      instantlyCampaignId,
      instantly_campaign_id, // Handle both camelCase and snake_case
      status
    } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
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

    // Check if user has permission to update campaigns for this company
    if (company && userRole === 'member' && !allowedCompanies.includes(company.toLowerCase())) {
      return NextResponse.json(
        { error: 'You do not have permission to update campaigns for this company' },
        { status: 403 }
      )
    }

    // Build update data object
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (company !== undefined) updateData.company = getCompanyType(company)
    if (description !== undefined) updateData.description = description
    
    // Handle both camelCase and snake_case date fields
    const finalStartDate = startDate || start_date
    const finalEndDate = endDate || end_date
    const finalInstantlyCampaignId = instantlyCampaignId || instantly_campaign_id
    
    if (finalStartDate !== undefined) updateData.startDate = finalStartDate ? new Date(finalStartDate) : null
    if (finalEndDate !== undefined) updateData.endDate = finalEndDate ? new Date(finalEndDate) : null
    if (finalInstantlyCampaignId !== undefined) updateData.instantlyCampaignId = finalInstantlyCampaignId
    if (status !== undefined) updateData.status = status as CampaignStatusType

    // Update campaign using Prisma
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ campaign: updatedCampaign })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    // Get campaign ID from query parameters
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('id')

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // First, get the campaign to check permissions and get company info
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        company: true,
        createdById: true
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check permissions - only admin or campaign creator can delete
    if (userRole === 'member' && campaign.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this campaign' },
        { status: 403 }
      )
    }

    // Check company permissions for members
    if (userRole === 'member' && !allowedCompanies.includes(campaign.company.toLowerCase())) {
      return NextResponse.json(
        { error: 'You do not have permission to delete campaigns for this company' },
        { status: 403 }
      )
    }



    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find all leads associated with this campaign
      const campaignLeads = await tx.lead.findMany({
        where: { campaignId },
        select: { id: true }
      })

      // 2. Find all district contacts associated with this campaign
      const campaignDistrictContacts = await tx.districtContact.findMany({
        where: { campaignId },
        select: { id: true }
      })

      // 3. Get all lead IDs and district contact IDs
      const leadIds = campaignLeads.map(lead => lead.id)
      const districtContactIds = campaignDistrictContacts.map(contact => contact.id)

      // 4. Find all scheduled touchpoints in the future for these leads and contacts
      const now = new Date()
      const scheduledTouchpoints = await tx.touchpoint.findMany({
        where: {
          OR: [
            { leadId: { in: leadIds } },
            { districtContactId: { in: districtContactIds } }
          ],
          scheduledAt: {
            gt: now // Only future scheduled touchpoints
          },
          completedAt: null // Not yet completed
        },
        select: { id: true }
      })



      // 5. Delete all scheduled touchpoints
      if (scheduledTouchpoints.length > 0) {
        await tx.touchpoint.deleteMany({
          where: {
            id: { in: scheduledTouchpoints.map(tp => tp.id) }
          }
        })

      }

      // 6. Remove campaign association from leads (set campaignId to null)
      if (leadIds.length > 0) {
        await tx.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { campaignId: null }
        })

      }

      // 7. Remove campaign association from district contacts (set campaignId to null)
      if (districtContactIds.length > 0) {
        await tx.districtContact.updateMany({
          where: { id: { in: districtContactIds } },
          data: { campaignId: null }
        })

      }

      // 8. Finally, delete the campaign
      const deletedCampaign = await tx.campaign.delete({
        where: { id: campaignId }
      })

      return {
        deletedCampaign,
        deletedTouchpoints: scheduledTouchpoints.length,
        unassignedLeads: leadIds.length,
        unassignedDistrictContacts: districtContactIds.length
      }
    })



    return NextResponse.json({
      message: 'Campaign deleted successfully',
      deletedCampaign: result.deletedCampaign,
      cleanup: {
        deletedTouchpoints: result.deletedTouchpoints,
        unassignedLeads: result.unassignedLeads,
        unassignedDistrictContacts: result.unassignedDistrictContacts
      }
    })

  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 