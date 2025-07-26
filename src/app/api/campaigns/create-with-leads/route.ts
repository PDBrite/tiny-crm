import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const {
      name,
      company,
      description,
      startDate,
      endDate,
      outreachSequenceId,
      instantlyCampaignId,
      leadIds
    } = await request.json()

    if (!name || !company || !leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        company,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        outreachSequenceId,
        instantlyCampaignId: instantlyCampaignId || null,
      },
      include: {
        outreachSequence: {
          include: {
            steps: true
          }
        }
      }
    })

    // Assign selected leads to the campaign and update status to actively_contacting
    await prisma.lead.updateMany({
      where: {
        id: {
          in: leadIds,
        },
      },
      data: {
        campaignId: campaign.id,
        status: 'actively_contacting',
      },
    })

    // Verify leads were updated correctly
    const verifiedLeads = await prisma.lead.findMany({
      where: {
        id: {
          in: leadIds,
        },
      },
      select: {
        id: true,
        campaignId: true,
      },
    })
    
    const correctlyUpdated = verifiedLeads.filter(l => l.campaignId === campaign.id).length

    return NextResponse.json({
      campaign,
      leadsUpdated: correctlyUpdated,
      totalLeads: leadIds.length
    })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
} 