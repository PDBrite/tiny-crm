import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaign_id')

  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
  }
  
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
  }

  try {
    // Get all district_leads for the campaign
    const { data: districtLeads, error: districtLeadsError } = await supabaseAdmin
      .from('district_leads')
      .select('id')
      .eq('campaign_id', campaignId)

    if (districtLeadsError) throw districtLeadsError

    const districtLeadIds = districtLeads.map(dl => dl.id)

    if (districtLeadIds.length === 0) {
      return NextResponse.json({ touchpoints: [] })
    }

    // Get all district_contacts for those district_leads
    const { data: districtContacts, error: districtContactsError } = await supabaseAdmin
      .from('district_contacts')
      .select('id')
      .in('district_lead_id', districtLeadIds)

    if (districtContactsError) throw districtContactsError

    const districtContactIds = districtContacts.map(dc => dc.id)

    if (districtContactIds.length === 0) {
      return NextResponse.json({ touchpoints: [] })
    }

    // Get all touchpoints for those district_contacts
    const { data: touchpoints, error: touchpointsError } = await supabaseAdmin
      .from('touchpoints')
      .select(`
        *,
        district_contact:district_contacts(
          id,
          first_name,
          last_name,
          email,
          title,
          district_lead:district_leads(
            id,
            district_name
          )
        )
      `)
      .in('district_contact_id', districtContactIds)
      .order('scheduled_at', { ascending: true })

    if (touchpointsError) throw touchpointsError

    return NextResponse.json({ touchpoints })

  } catch (error: any) {
    console.error('Error fetching campaign touchpoints:', error)
    return NextResponse.json({ error: 'Failed to fetch touchpoints', details: error.message }, { status: 500 })
  }
} 