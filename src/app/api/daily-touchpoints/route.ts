import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { getTouchpointsDueToday, getOverdueTouchpoints } from '../../../utils/outreach-scheduler'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'today', 'overdue', or 'all'
    const date = url.searchParams.get('date') // Specific date in YYYY-MM-DD format
    const campaignId = url.searchParams.get('campaignId') // Filter by campaign
    
    // Determine company from session, not from query param for security
    let company: string | undefined;
    const requestedCompany = url.searchParams.get('company')
    
    if (userRole === 'member') {
      company = 'Avalern';
      if (!allowedCompanies.includes('avalern')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (requestedCompany && allowedCompanies.includes(requestedCompany.toLowerCase())) {
      company = requestedCompany;
    } else if (allowedCompanies.length > 0) {
      // Default to the first allowed company if none specified or invalid
      company = allowedCompanies[0].charAt(0).toUpperCase() + allowedCompanies[0].slice(1);
    }

    if (!company) {
      return NextResponse.json({ error: 'No company access configured for this user.' }, { status: 403 });
    }
    
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

    let touchpoints = []
    
    if (company === 'Avalern') {
      // For Avalern, fetch touchpoints for district contacts
      let query = supabase
        .from('touchpoints')
        .select(`
          *,
          district_contact:district_contacts!inner(
            id,
            first_name,
            last_name,
            email,
            phone,
            title,
            district_lead:district_leads!inner(
              id,
              district_name,
              county,
              company,
              campaign_id,
              campaign:campaigns(id, name, company)
            )
          )
        `)
        .is('completed_at', null) // Only get uncompleted touchpoints
        .eq('district_contact.district_lead.company', 'Avalern')

      // Filter by campaign if specified
      if (campaignId) {
        query = query.eq('district_contact.district_lead.campaign_id', campaignId)
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

      const { data: districtTouchpoints, error } = await query
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error fetching district touchpoints:', error)
        return NextResponse.json(
          { error: 'Failed to fetch touchpoints' },
          { status: 500 }
        )
      }

      // Transform district touchpoints to match the expected format
      touchpoints = (districtTouchpoints || []).map(tp => ({
        ...tp,
        lead: {
          id: tp.district_contact.id,
          first_name: tp.district_contact.first_name,
          last_name: tp.district_contact.last_name,
          email: tp.district_contact.email,
          phone: tp.district_contact.phone,
          city: tp.district_contact.district_lead.county,
          company: tp.district_contact.district_lead.district_name,
          campaign_id: tp.district_contact.district_lead.campaign_id,
          campaign: tp.district_contact.district_lead.campaign
        }
      }))
    } else {
      // For other companies (like CraftyCode), fetch regular lead touchpoints
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
            campaign:campaigns(name, company)
          )
        `)
        .is('completed_at', null) // Only get uncompleted touchpoints

      // Filter by company if specified
      if (company) {
        query = query.eq('lead.company', company)
      } else {
        // If no company is determined (which shouldn't happen with the new logic),
        // we should prevent fetching all data.
        return NextResponse.json({ touchpoints: [] });
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

      const { data: leadTouchpoints, error } = await query
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error fetching lead touchpoints:', error)
        return NextResponse.json(
          { error: 'Failed to fetch touchpoints' },
          { status: 500 }
        )
      }

      touchpoints = leadTouchpoints || []
    }

    // If specific date is provided, return touchpoints for that date
    if (date) {
      return NextResponse.json({
        touchpoints: touchpoints,
        date: date,
        total: touchpoints.length
      })
    }

    // Legacy categorization for today/overdue
    const todayTouchpoints = []
    const overdueTouchpoints = []

    for (const touchpoint of touchpoints) {
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const allowedCompanies = session.user.allowedCompanies || [];

    const { touchpointId, outcome, outcomeEnum, notes } = await request.json()
    
    if (!touchpointId) {
      return NextResponse.json(
        { error: 'Touchpoint ID is required' },
        { status: 400 }
      )
    }

    // Security check: Verify the user has permission to update this touchpoint
    const { data: touchpointToUpdate, error: fetchError } = await supabase
      .from('touchpoints')
      .select(`
        id,
        lead:leads(id, company),
        district_contact:district_contacts(id, district_lead:district_leads(id, company))
      `)
      .eq('id', touchpointId)
      .single();

    if (fetchError || !touchpointToUpdate) {
      return NextResponse.json({ error: 'Touchpoint not found' }, { status: 404 });
    }
    
    const touchpointCompany = touchpointToUpdate.lead?.company || touchpointToUpdate.district_contact?.district_lead?.company;

    if (!touchpointCompany) {
       return NextResponse.json({ error: 'Could not determine touchpoint company' }, { status: 400 });
    }
    
    const touchpointCompanyNormalized = touchpointCompany.toLowerCase();

    if (!allowedCompanies.includes(touchpointCompanyNormalized)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (userRole === 'member' && touchpointCompanyNormalized !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        lead:leads(id, email, first_name, last_name),
        district_contact:district_contacts(
          id, 
          email, 
          first_name, 
          last_name,
          district_lead:district_leads(id)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update touchpoint' },
        { status: 500 }
      )
    }

    // Update appropriate record's last_contacted_at
    if (touchpoint.lead) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', touchpoint.lead.id)
    } else if (touchpoint.district_contact) {
      await supabase
        .from('district_leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', touchpoint.district_contact.district_lead.id)
    }

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