import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

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
      start_date: campaign.startDate?.toISOString(),
      end_date: campaign.endDate?.toISOString(),
      created_at: campaign.createdAt.toISOString(),
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
    
    return NextResponse.json({
      campaign: formattedCampaign
    })
    
  } catch (error) {
    console.error('Error in campaign data API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 

    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, company, status, created_at')
      .eq('id', campaignId)
      .single()
    
    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign', details: campaignError.message },
        { status: 500 }
      )
    }
    
    // Fetch district leads associated with this campaign
    const { data: districtLeads, error: districtError } = await supabaseAdmin
      .from('district_leads')
      .select('id, district_name, county, status')
      .eq('campaign_id', campaignId)
    
    if (districtError) {
      console.error('Error fetching district leads:', districtError)
      return NextResponse.json({
        campaign,
        district_leads_error: 'Error fetching district leads',
        district_leads: [],
        district_leads_count: 0
      })
    }
    
    // If we have district leads, fetch their contacts
    let districtContacts: any[] = []
    let contactsErrorMessage = null
    
    if (districtLeads && districtLeads.length > 0) {
      const districtIds = districtLeads.map(d => d.id)
      
      const { data: contacts, error: contactsError } = await supabaseAdmin
        .from('district_contacts')
        .select('id, first_name, last_name, email, district_lead_id')
        .in('district_lead_id', districtIds)
      
      if (contactsError) {
        console.error('Error fetching district contacts:', contactsError)
        contactsErrorMessage = 'Error fetching district contacts'
      } else {
        districtContacts = contacts || []
      }
    }
    
    // Fetch touchpoints for this campaign
    let touchpoints: any[] = []
    let touchpointsErrorMessage = null
    
    if (districtContacts && districtContacts.length > 0) {
      try {
        // Get touchpoints for district contacts
        const districtContactIds = districtContacts.map(c => c.id)
        
        // Use a more direct query to get all touchpoints for these contacts
        const { data: districtTouchpoints, error: dtError } = await supabaseAdmin
          .from('touchpoints')
          .select('*')
          .in('district_contact_id', districtContactIds)
        
        if (dtError) {
          console.error('Error fetching district contact touchpoints:', dtError)
          touchpointsErrorMessage = 'Error fetching district contact touchpoints'
        } else {
          touchpoints = districtTouchpoints || []
          console.log(`Found ${touchpoints.length} touchpoints for district contacts`)
        }
      } catch (error) {
        console.error('Error fetching touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching touchpoints'
      }
    } else {
      // Try to get touchpoints directly for the campaign
      try {
        // First get all leads for this campaign
        const { data: campaignLeads, error: leadsError } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('campaign_id', campaignId)
          
        if (!leadsError && campaignLeads && campaignLeads.length > 0) {
          const leadIds = campaignLeads.map(l => l.id)
          
          // Get touchpoints for these leads
          const { data: leadTouchpoints, error: ltError } = await supabaseAdmin
            .from('touchpoints')
            .select('*')
            .in('lead_id', leadIds)
            
          if (ltError) {
            console.error('Error fetching lead touchpoints:', ltError)
            touchpointsErrorMessage = 'Error fetching lead touchpoints'
          } else {
            touchpoints = leadTouchpoints || []
            console.log(`Found ${touchpoints.length} touchpoints for leads`)
          }
        }
      } catch (error) {
        console.error('Error fetching lead touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching lead touchpoints'
      }
    }
    
    return NextResponse.json({
      campaign,
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