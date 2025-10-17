import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign touchpoints API called with URL:', request.url)
    
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    const typeFilter = url.searchParams.get('type')
    const statusFilter = url.searchParams.get('status')
    
    console.log('Campaign touchpoints API: Query params:', { campaignId, typeFilter, statusFilter })

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // First, get the campaign to determine if it's Avalern or not
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        company: true
      }
    })
      
    if (!campaign) {
      console.error(`Campaign touchpoints API: Campaign with ID ${campaignId} not found`)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    console.log(`Campaign touchpoints API: Found campaign: ${campaign.name} (${campaign.id}) - Company: ${campaign.company}`)
    
    let allTouchpoints = []
    
    // For Avalern campaigns, we need to get district contacts first
    if (campaign.company === 'Avalern') {
      // Get all district contacts for this campaign with their touchpoints
      const districtContacts = await prisma.districtContact.findMany({
        where: {
          campaignId: campaignId
        },
        include: {
          district: true,
          touchpoints: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })
      
      console.log(`Found ${districtContacts.length} district contacts for campaign ${campaignId}`)
      
      // Flatten and transform touchpoints
      const enrichedTouchpoints = districtContacts.flatMap(contact => {
        return contact.touchpoints.map(tp => ({
          id: tp.id,
          district_contact_id: tp.districtContactId,
          lead_id: tp.leadId,
          type: tp.type,
          subject: tp.subject || '',
          content: tp.content || '',
          scheduled_at: tp.scheduledAt,
          completed_at: tp.completedAt,
          outcome: tp.outcome || null,
          created_at: tp.createdAt,
          created_by_id: tp.createdById,
          created_by: tp.createdBy ? {
            id: tp.createdBy.id,
            email: tp.createdBy.email,
            first_name: tp.createdBy.firstName,
            last_name: tp.createdBy.lastName
          } : null,
          // Add contact info
          contact: {
            id: contact.id,
            first_name: contact.firstName,
            last_name: contact.lastName,
            email: contact.email || '',
            phone: contact.phone || '',
            title: contact.title || '',
            company: contact.district?.name || '',
            city: contact.district?.county || '',
            state: contact.state || 'California',
            status: contact.status
          },
          is_district_contact: true,
          campaign_id: campaignId,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            company: campaign.company
          }
        }))
      })
      
      allTouchpoints = enrichedTouchpoints
    } else {
      // For regular campaigns, get leads and their touchpoints
      const leads = await prisma.lead.findMany({
        where: {
          campaignId: campaignId
        },
        include: {
          touchpoints: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })
      
      console.log(`Found ${leads.length} leads for campaign ${campaignId}`)
      
      // Flatten and transform touchpoints
      const enrichedTouchpoints = leads.flatMap(lead => {
        return lead.touchpoints.map(tp => ({
          id: tp.id,
          lead_id: tp.leadId,
          district_contact_id: tp.districtContactId,
          type: tp.type,
          subject: tp.subject || '',
          content: tp.content || '',
          scheduled_at: tp.scheduledAt,
          completed_at: tp.completedAt,
          outcome: tp.outcome || null,
          created_at: tp.createdAt,
          created_by_id: tp.createdById,
          created_by: tp.createdBy ? {
            id: tp.createdBy.id,
            email: tp.createdBy.email,
            first_name: tp.createdBy.firstName,
            last_name: tp.createdBy.lastName
          } : null,
          // Add contact info
          contact: {
            id: lead.id,
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email || '',
            phone: lead.phone || '',
            company: lead.company || '',
            city: lead.city || '',
            state: lead.state || '',
            status: lead.status
          },
          is_district_contact: false,
          campaign_id: campaignId,
          campaign: {
            id: campaign.id,
            name: campaign.name,
            company: campaign.company
          }
        }))
      })
      
      allTouchpoints = enrichedTouchpoints
    }
    
    // Apply filters if provided
    let filteredTouchpoints = [...allTouchpoints]
    
    if (typeFilter) {
      filteredTouchpoints = filteredTouchpoints.filter(tp => tp.type === typeFilter)
    }
    
    if (statusFilter) {
      if (statusFilter === 'scheduled') {
        filteredTouchpoints = filteredTouchpoints.filter(tp => !tp.completed_at)
      } else if (statusFilter === 'completed') {
        filteredTouchpoints = filteredTouchpoints.filter(tp => tp.completed_at)
      }
    }
    
    // Sort touchpoints by scheduled date
    filteredTouchpoints.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.completed_at || 0).getTime()
      const dateB = new Date(b.scheduled_at || b.completed_at || 0).getTime()
      return dateA - dateB
    })
    
    return NextResponse.json({
      touchpoints: filteredTouchpoints,
      count: filteredTouchpoints.length,
      campaign_name: campaign.name,
      company: campaign.company
    })
    
  } catch (error) {
    console.error('Error in campaign touchpoints API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
