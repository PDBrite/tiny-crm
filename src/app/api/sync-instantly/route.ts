import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    if (!instantlyCampaignId) {
      return NextResponse.json({ error: 'Instantly campaign ID is required' }, { status: 400 })
    }

    // Get Instantly.ai API key from environment variables
    const instantlyApiKey = process.env.INSTANTLY_API_KEY
    if (!instantlyApiKey) {
      return NextResponse.json({ error: 'Instantly API key not configured' }, { status: 500 })
    }

    // Fetch campaign data from Instantly.ai
    const instantlyResponse = await fetch(`https://api.instantly.ai/api/v1/campaign/${instantlyCampaignId}/emails`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!instantlyResponse.ok) {
      throw new Error(`Instantly API error: ${instantlyResponse.status} ${instantlyResponse.statusText}`)
    }

    const instantlyData: InstantlyEmailStatus[] = await instantlyResponse.json()

    // Get all email touchpoints for this campaign
    let touchpointsQuery = supabase
      .from('touchpoints')
      .select(`
        id,
        lead_id,
        type,
        scheduled_at,
        completed_at,
        outcome,
        leads!inner(
          id,
          email,
          campaign_id,
          campaigns(
            id,
            name,
            instantly_campaign_id
          )
        )
      `)
      .eq('type', 'email')

    if (campaignId) {
      touchpointsQuery = touchpointsQuery.eq('leads.campaign_id', campaignId)
    } else if (company) {
      touchpointsQuery = touchpointsQuery.eq('leads.campaigns.company', company)
    }

    // Only get touchpoints that correspond to this Instantly campaign
    touchpointsQuery = touchpointsQuery.eq('leads.campaigns.instantly_campaign_id', instantlyCampaignId)

    const { data: touchpoints, error: touchpointsError } = await touchpointsQuery

    if (touchpointsError) {
      console.error('Error fetching touchpoints:', touchpointsError)
      return NextResponse.json({ error: 'Failed to fetch touchpoints' }, { status: 500 })
    }

    let updatedCount = 0
    const updates = []

    // Match touchpoints with Instantly data and update statuses
    for (const touchpoint of touchpoints || []) {
      const leadEmail = (touchpoint.leads as any).email
      const instantlyEmail = instantlyData.find(email => email.email.toLowerCase() === leadEmail.toLowerCase())

      if (instantlyEmail) {
        let shouldUpdate = false
        let newOutcome = touchpoint.outcome
        let newCompletedAt = touchpoint.completed_at

        // Map Instantly status to our touchpoint outcome
        switch (instantlyEmail.status) {
          case 'sent':
            if (!touchpoint.completed_at) {
              newCompletedAt = instantlyEmail.sent_at || new Date().toISOString()
              newOutcome = 'sent'
              shouldUpdate = true
            }
            break
          case 'opened':
            newOutcome = 'opened'
            newCompletedAt = instantlyEmail.opened_at || instantlyEmail.sent_at || new Date().toISOString()
            shouldUpdate = true
            break
          case 'clicked':
            newOutcome = 'clicked'
            newCompletedAt = instantlyEmail.clicked_at || instantlyEmail.opened_at || instantlyEmail.sent_at || new Date().toISOString()
            shouldUpdate = true
            break
          case 'replied':
            newOutcome = 'replied'
            newCompletedAt = instantlyEmail.replied_at || new Date().toISOString()
            shouldUpdate = true
            break
          case 'bounced':
            newOutcome = 'bounced'
            newCompletedAt = instantlyEmail.bounced_at || new Date().toISOString()
            shouldUpdate = true
            break
          case 'unsubscribed':
            newOutcome = 'unsubscribed'
            newCompletedAt = instantlyEmail.unsubscribed_at || new Date().toISOString()
            shouldUpdate = true
            break
        }

        if (shouldUpdate) {
          updates.push({
            id: touchpoint.id,
            completed_at: newCompletedAt,
            outcome: newOutcome
          })
        }
      }
    }

    // Batch update touchpoints
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('touchpoints')
          .update({
            completed_at: update.completed_at,
            outcome: update.outcome
          })
          .eq('id', update.id)

        if (updateError) {
          console.error('Error updating touchpoint:', updateError)
        } else {
          updatedCount++
        }
      }

      // Update lead last_contacted_at for leads with updated touchpoints
      const leadIds = updates.map(update => {
        const touchpoint = touchpoints?.find(tp => tp.id === update.id)
        return touchpoint?.lead_id
      }).filter(Boolean)

      if (leadIds.length > 0) {
        await supabase
          .from('leads')
          .update({ last_contacted_at: new Date().toISOString() })
          .in('id', leadIds)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${updatedCount} email touchpoints from Instantly.ai`,
      updatedCount,
      totalInstantlyEmails: instantlyData.length,
      totalTouchpoints: touchpoints?.length || 0
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Instantly.ai', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 