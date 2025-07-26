import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scheduleTouchpointsForLead } from '@/utils/outreach-scheduler'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { TouchpointType } from '@prisma/client'
import { OutreachStep } from '@/types/leads'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaign_id, district_ids } = await request.json()

    if (!campaign_id || !district_ids || !Array.isArray(district_ids)) {
      return NextResponse.json(
        { error: 'Campaign ID and an array of district IDs are required' },
        { status: 400 }
      )
    }

    // Get campaign information including outreach sequence
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaign_id },
      include: {
        outreachSequence: {
          include: {
            steps: {
              orderBy: {
                stepOrder: 'asc'
              }
            }
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

    // Update districts to associate them with the campaign
    const updateResult = await prisma.$transaction(
      district_ids.map(districtId => 
        prisma.district.update({
          where: { id: districtId },
          data: { 
            // We don't have a status field in the District model, so we're just updating the campaign
            // If you need to update status, you'd need to update the related DistrictContact records
          }
        })
      )
    )

    // Fetch all district contacts for these districts
    const districtContacts = await prisma.districtContact.findMany({
      where: {
        districtId: { in: district_ids }
      },
      include: {
        district: true
      }
    })

    // Update district contacts to associate them with the campaign
    const updatedContacts = await prisma.$transaction(
      districtContacts.map(contact => 
        prisma.districtContact.update({
          where: { id: contact.id },
          data: { 
            campaignId: campaign_id,
            status: 'actively_contacting'
          }
        })
      )
    )

    // If the campaign has an outreach sequence, create touchpoints for the contacts
    let touchpointsCreated = 0
    if (campaign.outreachSequence?.steps && districtContacts.length > 0) {
      const campaignStartDate = new Date(campaign.startDate || campaign.createdAt)
      
      // Convert Prisma steps to OutreachStep format expected by the scheduler
      const outreachSteps: OutreachStep[] = campaign.outreachSequence.steps.map(step => ({
        id: step.id,
        sequence_id: step.sequenceId,
        step_order: step.stepOrder,
        type: step.type,
        name: step.name || undefined,
        content_link: step.contentLink || undefined,
        day_offset: step.dayOffset,
        days_after_previous: step.daysAfterPrevious || undefined,
        created_at: step.createdAt.toISOString(),
        updated_at: step.updatedAt.toISOString()
      }))
      
      const touchpointsToCreate = []
      
      // Create touchpoints for each contact
      for (const contact of districtContacts) {
        // Get district name to use as company name
        const districtName = contact.district?.name || ''
        
        // Schedule touchpoints for this contact
        const scheduledTouchpoints = scheduleTouchpointsForLead(
          { districtContactId: contact.id },
          campaignStartDate,
          outreachSteps,
          {
            first_name: contact.firstName,
            last_name: contact.lastName,
            company: districtName,
            city: ''
          }
        )
        
        // Filter touchpoints based on available contact methods
        const filteredTouchpoints = scheduledTouchpoints.filter(tp => {
          // Only schedule email touchpoints if contact has email
          if (tp.type === 'email') {
            return contact.email && contact.email.trim().length > 0
          }
          // Only schedule call touchpoints if contact has phone
          if (tp.type === 'call') {
            return contact.phone && contact.phone.trim().length > 0
          }
          // LinkedIn messages don't require email or phone
          return true
        })
        
        touchpointsToCreate.push(...filteredTouchpoints)
      }
      
      // Insert touchpoints in batches to avoid timeouts
      if (touchpointsToCreate.length > 0) {
        const BATCH_SIZE = 50
        for (let i = 0; i < touchpointsToCreate.length; i += BATCH_SIZE) {
          const batch = touchpointsToCreate.slice(i, i + BATCH_SIZE)
          
          try {
            const createdTouchpoints = await prisma.touchpoint.createMany({
              data: batch.map(tp => ({
                leadId: tp.lead_id,
                districtContactId: tp.district_contact_id,
                type: tp.type as TouchpointType,
                subject: tp.subject || null,
                content: tp.content || null,
                scheduledAt: tp.scheduled_at ? new Date(tp.scheduled_at) : null,
                completedAt: null,
                outcome: null
              }))
            })
            
            touchpointsCreated += createdTouchpoints.count
          } catch (batchError) {
            console.error(`Error inserting touchpoints batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError)
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Districts assigned to campaign successfully',
      data: updateResult,
      contacts: districtContacts,
      contacts_count: districtContacts.length,
      touchpoints_created: touchpointsCreated
    })

  } catch (error) {
    console.error('Error in assign-districts-to-campaign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 