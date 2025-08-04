import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextBatchStartDate } from '../../../utils/outreach-scheduler'

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json()
    
    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Get campaign with outreach sequence
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        outreachSequence: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
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

    if (!campaign.outreachSequence) {
      return NextResponse.json(
        { error: 'Campaign does not have an outreach sequence assigned' },
        { status: 400 }
      )
    }

    // This endpoint is now deprecated - batch processing has been removed
    return NextResponse.json({
      success: false,
      message: 'This endpoint has been deprecated. Please use the assign-districts-to-campaign endpoint instead.',
      campaign_name: campaign.name,
      sequence_name: campaign.outreachSequence.name
    })

  } catch (error) {
    console.error('Batch creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available leads for batching
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaignId')

    // This endpoint is now deprecated
    let campaignInfo = null
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          outreachSequence: {
            select: {
              name: true,
              description: true
            }
          }
        }
      })

      campaignInfo = campaign
    }

    return NextResponse.json({
      message: 'This endpoint has been deprecated',
      next_batch_date: getNextBatchStartDate().toISOString(),
      campaign: campaignInfo
    })

  } catch (error) {
    console.error('Error checking available leads:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 