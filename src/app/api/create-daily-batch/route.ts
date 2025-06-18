import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { scheduleTouchpointsForLead, getNextBatchStartDate } from '../../../utils/outreach-scheduler'

export async function POST(request: NextRequest) {
  try {
    const { campaignId, batchSize = 50 } = await request.json()
    
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

    // Get leads that are not yet in any campaign (available for batching)
    const { data: availableLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .is('campaign_id', null)
      .eq('status', 'not_contacted')
      .limit(batchSize)

    if (leadsError) {
      return NextResponse.json(
        { error: 'Failed to fetch available leads' },
        { status: 500 }
      )
    }

    if (!availableLeads || availableLeads.length === 0) {
      return NextResponse.json(
        { error: 'No available leads for batching' },
        { status: 404 }
      )
    }

    const batchStartDate = getNextBatchStartDate()
    const processedLeads = []
    const errors = []

    // Process each lead
    for (const lead of availableLeads) {
      try {
        // Assign lead to campaign
        const { error: updateError } = await supabase
          .from('leads')
          .update({ 
            campaign_id: campaignId,
            status: 'actively_contacting' // Update status to indicate they're in outreach
          })
          .eq('id', lead.id)

        if (updateError) {
          errors.push(`Failed to assign lead ${lead.email} to campaign: ${updateError.message}`)
          continue
        }

        // Schedule touchpoints for this lead
        const scheduledTouchpoints = scheduleTouchpointsForLead(
          lead.id,
          batchStartDate,
          campaign.outreach_sequence.steps,
          {
            first_name: lead.first_name,
            last_name: lead.last_name,
            city: lead.city,
            company: lead.company
          }
        )

        // Insert scheduled touchpoints
        const { error: touchpointsError } = await supabase
          .from('touchpoints')
          .insert(scheduledTouchpoints)

        if (touchpointsError) {
          errors.push(`Failed to schedule touchpoints for lead ${lead.email}: ${touchpointsError.message}`)
          
          // Rollback: remove lead from campaign
          await supabase
            .from('leads')
            .update({ campaign_id: null, status: 'not_contacted' })
            .eq('id', lead.id)
          continue
        }

        processedLeads.push({
          id: lead.id,
          email: lead.email,
          name: `${lead.first_name} ${lead.last_name}`,
          touchpoints_scheduled: scheduledTouchpoints.length
        })

      } catch (error) {
        console.error(`Error processing lead ${lead.email}:`, error)
        errors.push(`Unexpected error processing lead ${lead.email}`)
      }
    }

    return NextResponse.json({
      success: true,
      batch_date: batchStartDate.toISOString(),
      campaign_name: campaign.name,
      sequence_name: campaign.outreach_sequence.name,
      processed_count: processedLeads.length,
      requested_count: batchSize,
      available_count: availableLeads.length,
      processed_leads: processedLeads,
      errors: errors.length > 0 ? errors : undefined
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

    // Get count of available leads
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('campaign_id', null)
      .eq('status', 'not_contacted')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to count available leads' },
        { status: 500 }
      )
    }

    // If campaign ID provided, get campaign info
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
      available_leads_count: count || 0,
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