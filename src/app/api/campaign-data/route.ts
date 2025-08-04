import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication (optional)
    const session = await getServerSession(authOptions)
    
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('id')
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    // Fetch campaign data with Prisma
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
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
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Format the campaign data to match the expected structure
    const formattedCampaign = {
      id: campaign.id,
      name: campaign.name,
      company: campaign.company,
      description: campaign.description,
      start_date: campaign.startDate ? campaign.startDate.toISOString().split('T')[0] : null,
      end_date: campaign.endDate ? campaign.endDate.toISOString().split('T')[0] : null,
      created_at: campaign.createdAt.toISOString().split('T')[0],
      status: campaign.status,
      outreach_sequence_id: campaign.outreachSequenceId,
      outreach_sequence: campaign.outreachSequence ? {
        id: campaign.outreachSequence.id,
        name: campaign.outreachSequence.name,
        description: campaign.outreachSequence.description,
        steps: campaign.outreachSequence.steps.map(step => ({
          id: step.id,
          sequence_id: step.sequenceId,
          step_order: step.stepOrder,
          type: step.type,
          day_offset: step.dayOffset,
          days_after_previous: step.daysAfterPrevious
        }))
      } : null,
      instantly_campaign_id: campaign.instantlyCampaignId,
      created_by: campaign.createdBy ? {
        id: campaign.createdBy.id,
        email: campaign.createdBy.email,
        name: `${campaign.createdBy.firstName || ''} ${campaign.createdBy.lastName || ''}`.trim() || campaign.createdBy.email,
        role: campaign.createdBy.role
      } : null
    }

    // Fetch district contacts associated with this campaign
    const allDistrictContacts = await prisma.districtContact.findMany({
      where: { campaignId: campaignId },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            county: true
          }
        }
      }
    })

    // Get unique districts from the contacts
    const districtLeads = allDistrictContacts
      .map(contact => contact.district)
      .filter((district, index, self) => 
        district && self.findIndex(d => d?.id === district.id) === index
      )

    // Use the already fetched district contacts
    const districtContacts = allDistrictContacts
    let contactsErrorMessage: string | null = null
    
    // Fetch touchpoints for this campaign
    let touchpoints: any[] = []
    let touchpointsErrorMessage: string | null = null
    
    if (districtContacts && districtContacts.length > 0) {
      try {
        // Get touchpoints for district contacts
        const districtContactIds = districtContacts.map(c => c.id)
        
        touchpoints = await prisma.touchpoint.findMany({
          where: {
            districtContactId: {
              in: districtContactIds
            }
          }
        })
        
        console.log(`Found ${touchpoints.length} touchpoints for district contacts`)
      } catch (error) {
        console.error('Error fetching touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching touchpoints'
      }
    } else {
      // Try to get touchpoints directly for the campaign
      try {
        // First get all leads for this campaign
        const campaignLeads = await prisma.lead.findMany({
          where: { campaignId: campaignId },
          select: { id: true }
        })
          
        if (campaignLeads && campaignLeads.length > 0) {
          const leadIds = campaignLeads.map(l => l.id)
          
          // Get touchpoints for these leads
          touchpoints = await prisma.touchpoint.findMany({
            where: {
              leadId: {
                in: leadIds
              }
            }
          })
            
          console.log(`Found ${touchpoints.length} touchpoints for leads`)
        }
      } catch (error) {
        console.error('Error fetching lead touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching lead touchpoints'
      }
    }
    
    return NextResponse.json({
      campaign: formattedCampaign,
      district_leads: districtLeads || [],
      district_leads_count: districtLeads?.length || 0,
      district_contacts: districtContacts,
      district_contacts_count: districtContacts.length,
      contacts_error: contactsErrorMessage,
      touchpoints: touchpoints || [],
      touchpoints_count: touchpoints?.length || 0,
      touchpoints_error: touchpointsErrorMessage
    })
    
  } catch (error) {
    console.error('Error in campaign data API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 