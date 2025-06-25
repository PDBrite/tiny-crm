import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
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
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        outreach_sequence:outreach_sequences(
          *,
          steps:outreach_steps(*)
        )
      `)
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (!campaign.outreach_sequence) {
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
      sequence_name: campaign.outreach_sequence.name
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
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          *,
          outreach_sequence:outreach_sequences(name, description)
        `)
        .eq('id', campaignId)
        .single()

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