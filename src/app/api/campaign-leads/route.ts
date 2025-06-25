import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper function to enrich leads with touchpoint data
async function enrichLeadsWithTouchpoints(leads: any[], isDistrictContacts: boolean) {
  if (!supabaseAdmin) return leads;
  
  for (const lead of leads) {
    try {
      // Get touchpoint count
      const idField = isDistrictContacts ? 'district_contact_id' : 'lead_id';
      const { count: touchpointCount } = await supabaseAdmin
        .from('touchpoints')
        .select('*', { count: 'exact', head: true })
        .eq(idField, lead.id);
      
      lead.contact_attempts_count = touchpointCount || 0;
      
      // Get last contact date
      const { data: lastTouchpoint, error: lastTpError } = await supabaseAdmin
        .from('touchpoints')
        .select('completed_at')
        .eq(idField, lead.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!lastTpError && lastTouchpoint) {
        lead.last_contacted_at = lastTouchpoint.completed_at;
      }
    } catch (error) {
      console.error(`Error enriching lead ${lead.id} with touchpoint data:`, error);
    }
  }
  
  return leads;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign leads API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('Campaign leads API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('Campaign leads API: Session cookie found')
    }
    
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    const company = url.searchParams.get('company')
    
    console.log('Campaign leads API: Query params:', { campaignId, company })

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      )
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }

    // First check if this is an Avalern campaign
    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, company')
      .eq('id', campaignId)
      .single()
    
    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign' },
        { status: 500 }
      )
    }
    
    const isAvalern = campaignData.company === 'Avalern'
    console.log(`Campaign belongs to ${campaignData.company}`)
    
    let leads: any[] = []
    
    if (isAvalern) {
      // For Avalern campaigns, fetch district contacts
      console.log('Fetching Avalern district contacts for campaign:', campaignId)
      
      // First verify that district_leads exist for this campaign
      const { data: districtLeads, error: districtLeadsError } = await supabaseAdmin
        .from('district_leads')
        .select('id, district_name')
        .eq('campaign_id', campaignId)
      
      if (districtLeadsError) {
        console.error('Error fetching district leads:', districtLeadsError)
      } else {
        console.log(`Found ${districtLeads?.length || 0} district leads for campaign ${campaignId}`)
        if (districtLeads && districtLeads.length > 0) {
          console.log('Sample district lead:', districtLeads[0])
        }
      }
      
      // Query district contacts with a more explicit join
      const { data: districtContacts, error: contactError } = await supabaseAdmin
        .from('district_contacts')
        .select(`
          id, first_name, last_name, title, email, phone, status, notes, district_lead_id,
          district_lead:district_leads(id, district_name, campaign_id)
        `)
        .in('district_lead_id', districtLeads?.map(d => d.id) || [])
      
      if (contactError) {
        console.error('Error fetching district contacts:', contactError)
        return NextResponse.json(
          { error: 'Failed to fetch district contacts', details: contactError.message },
          { status: 500 }
        )
      }
      
      console.log(`Found ${districtContacts?.length || 0} district contacts`)
      if (districtContacts && districtContacts.length > 0) {
        console.log('Sample district contact:', JSON.stringify(districtContacts[0], null, 2))
      }
      
      // Transform district contacts to match lead structure
      leads = (districtContacts || []).map((contact: any) => ({
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.district_lead?.district_name || '',
        district_lead_id: contact.district_lead_id,
        status: contact.status || 'not_contacted',
        notes: contact.notes,
        title: contact.title,
        city: '', // District contacts don't have city/state
        state: '',
        linkedin_url: '',
        website_url: '',
        source: 'District Import',
        contact_attempts_count: 0,
        last_contacted_at: null,
        is_district_contact: true
      }))
      
      // Enrich with touchpoint counts if supabaseAdmin is available
      if (supabaseAdmin) {
        leads = await enrichLeadsWithTouchpoints(leads, true)
      }
    } else {
      // For other companies, fetch regular leads
      const { data: regularLeads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select(`
          id, first_name, last_name, email, status, city, state, company, 
          phone, linkedin_url, website_url, online_profile, source, created_at
        `)
        .eq('campaign_id', campaignId)
      
      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        return NextResponse.json(
          { error: 'Failed to fetch leads' },
          { status: 500 }
        )
      }
      
      // Process leads to add contact attempt counts and last contact date
      leads = await Promise.all((regularLeads || []).map(async (lead) => {
        return {
          ...lead,
          contact_attempts_count: 0,
          last_contacted_at: null,
          is_district_contact: false
        }
      }))
      
      // Enrich with touchpoint counts if supabaseAdmin is available
      if (supabaseAdmin) {
        leads = await enrichLeadsWithTouchpoints(leads, false)
      }
    }
    
    console.log(`Found ${leads.length} leads/contacts for campaign ${campaignId}`)
    return NextResponse.json({
      leads,
      count: leads.length
    })
    
  } catch (error) {
    console.error('Error in campaign leads API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 