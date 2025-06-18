import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const campaignId = searchParams.get('campaignId')
    const company = searchParams.get('company')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    // Build the query with lead join for company filtering
    let query = supabase
      .from('touchpoints')
      .select(`
        scheduled_at,
        lead:leads!inner(company, campaign_id)
      `)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate + 'T23:59:59.999Z')
      .is('completed_at', null)

    // Add company filter if provided
    if (company) {
      query = query.eq('lead.company', company)
    }

    // Add campaign filter if provided
    if (campaignId) {
      query = query.eq('lead.campaign_id', campaignId)
    }

    const { data: touchpoints, error } = await query

    if (error) {
      console.error('Error fetching touchpoint counts:', error)
      return NextResponse.json({ error: 'Failed to fetch touchpoint counts' }, { status: 500 })
    }

    // Count touchpoints by date
    const counts: Record<string, number> = {}
    
    touchpoints?.forEach((touchpoint: any) => {
      const date = new Date(touchpoint.scheduled_at).toISOString().split('T')[0]
      counts[date] = (counts[date] || 0) + 1
    })

    return NextResponse.json({ counts })
  } catch (error) {
    console.error('Error in touchpoint-counts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 