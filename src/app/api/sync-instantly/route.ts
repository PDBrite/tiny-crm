import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface InstantlyEmailStatus {
  email: string
  status: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed'
  campaign_id: string
  sent_at?: string
  opened_at?: string
  clicked_at?: string
  replied_at?: string
  bounced_at?: string
  unsubscribed_at?: string
}

interface InstantlyCampaignData {
  id: string
  name: string
  emails: InstantlyEmailStatus[]
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId, company, instantlyCampaignId } = await request.json()

    // This endpoint has been deprecated - sync functionality has been removed
    return NextResponse.json({
      success: false,
      message: 'This endpoint has been deprecated. Sync functionality is no longer available.',
      campaignId,
      company,
      instantlyCampaignId
    })

  } catch (error) {
    console.error('Sync instantly error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 