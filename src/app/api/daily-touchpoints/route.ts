import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { getTouchpointsDueToday, getOverdueTouchpoints } from '../../../utils/outreach-scheduler'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'today', 'overdue', or 'all'
    const date = url.searchParams.get('date') // Specific date in YYYY-MM-DD format
    const campaignId = url.searchParams.get('campaignId') // Filter by campaign
    const company = url.searchParams.get('company') // Filter by company
    
    // If specific date is provided, use that; otherwise use today
    let targetDate: Date
    if (date) {
      targetDate = new Date(date + 'T00:00:00.000Z')
    } else {
      targetDate = new Date()
      targetDate.setHours(0, 0, 0, 0)
    }
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    let query = supabase
      .from('touchpoints')
      .select(`
        *,
        lead:leads!inner(
          id,
          first_name,
          last_name,
          email,
          phone,
          city,
          company,
          campaign_id,
          campaign:campaigns(name)
        )
      `)
      .is('completed_at', null) // Only get uncompleted touchpoints

    // Filter by company if specified
    if (company) {
      query = query.eq('lead.company', company)
    }

    // Filter by campaign if specified
    if (campaignId) {
      query = query.eq('lead.campaign_id', campaignId)
    }

    // If specific date is provided, get touchpoints for that date
    if (date) {
      query = query
        .gte('scheduled_at', targetDate.toISOString())
        .lt('scheduled_at', nextDay.toISOString())
    } else {
      // Filter by type for legacy support
      if (type === 'today') {
        query = query
          .gte('scheduled_at', targetDate.toISOString())
          .lt('scheduled_at', nextDay.toISOString())
    } else if (type === 'overdue') {
        query = query.lt('scheduled_at', targetDate.toISOString())
    } else {
      // Get both today and overdue
        query = query.lt('scheduled_at', nextDay.toISOString())
      }
    }

    const { data: touchpoints, error } = await query
      .order('scheduled_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch touchpoints' },
        { status: 500 }
      )
    }

    // If specific date is provided, return touchpoints for that date
    if (date) {
      return NextResponse.json({
        touchpoints: touchpoints || [],
        date: date,
        total: touchpoints?.length || 0
      })
    }

    // Legacy categorization for today/overdue
    const todayTouchpoints = []
    const overdueTouchpoints = []

    for (const touchpoint of touchpoints || []) {
      const scheduledDate = new Date(touchpoint.scheduled_at)
      scheduledDate.setHours(0, 0, 0, 0)

      if (scheduledDate < targetDate) {
        overdueTouchpoints.push(touchpoint)
      } else if (scheduledDate.getTime() === targetDate.getTime()) {
        todayTouchpoints.push(touchpoint)
      }
    }

    // Group by type for easier processing
    const groupedToday = groupTouchpointsByType(todayTouchpoints)
    const groupedOverdue = groupTouchpointsByType(overdueTouchpoints)

    return NextResponse.json({
      today: {
        total: todayTouchpoints.length,
        by_type: groupedToday,
        touchpoints: todayTouchpoints
      },
      overdue: {
        total: overdueTouchpoints.length,
        by_type: groupedOverdue,
        touchpoints: overdueTouchpoints
      },
      summary: {
        total_due: todayTouchpoints.length + overdueTouchpoints.length,
        emails_due: (groupedToday.email || 0) + (groupedOverdue.email || 0),
        calls_due: (groupedToday.call || 0) + (groupedOverdue.call || 0),
        linkedin_due: (groupedToday.linkedin_message || 0) + (groupedOverdue.linkedin_message || 0)
      }
    })

  } catch (error) {
    console.error('Error fetching daily touchpoints:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to mark touchpoints as completed
export async function POST(request: NextRequest) {
  try {
    const { touchpointId, outcome, outcomeEnum, notes } = await request.json()
    
    if (!touchpointId) {
      return NextResponse.json(
        { error: 'Touchpoint ID is required' },
        { status: 400 }
      )
    }

    const { data: touchpoint, error } = await supabase
      .from('touchpoints')
      .update({
        completed_at: new Date().toISOString(),
        outcome: outcome || null,
        outcome_enum: outcomeEnum || null,
        content: notes ? `${notes}` : undefined
      })
      .eq('id', touchpointId)
      .select(`
        *,
        lead:leads(id, email, first_name, last_name)
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update touchpoint' },
        { status: 500 }
      )
    }

    // Update lead's last_contacted_at
    await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', touchpoint.lead.id)

    return NextResponse.json({
      success: true,
      touchpoint,
      message: 'Touchpoint marked as completed'
    })

  } catch (error) {
    console.error('Error completing touchpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function groupTouchpointsByType(touchpoints: any[]) {
  return touchpoints.reduce((acc, touchpoint) => {
    const type = touchpoint.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
} 