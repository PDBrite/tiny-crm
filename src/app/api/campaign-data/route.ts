import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    
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

    // Fetch campaign data
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, company, status, created_at')
      .eq('id', campaignId)
      .single()
    
    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign', details: campaignError.message },
        { status: 500 }
      )
    }
    
    // Fetch district leads associated with this campaign
    const { data: districtLeads, error: districtError } = await supabaseAdmin
      .from('district_leads')
      .select('id, district_name, county, status')
      .eq('campaign_id', campaignId)
    
    if (districtError) {
      console.error('Error fetching district leads:', districtError)
      return NextResponse.json({
        campaign,
        district_leads_error: 'Error fetching district leads',
        district_leads: [],
        district_leads_count: 0
      })
    }
    
    // If we have district leads, fetch their contacts
    let districtContacts: any[] = []
    let contactsErrorMessage = null
    
    if (districtLeads && districtLeads.length > 0) {
      const districtIds = districtLeads.map(d => d.id)
      
      const { data: contacts, error: contactsError } = await supabaseAdmin
        .from('district_contacts')
        .select('id, first_name, last_name, email, district_lead_id')
        .in('district_lead_id', districtIds)
      
      if (contactsError) {
        console.error('Error fetching district contacts:', contactsError)
        contactsErrorMessage = 'Error fetching district contacts'
      } else {
        districtContacts = contacts || []
      }
    }
    
    // Fetch touchpoints for this campaign
    let touchpoints: any[] = []
    let touchpointsErrorMessage = null
    
    if (districtContacts && districtContacts.length > 0) {
      try {
        // Get touchpoints for district contacts
        const districtContactIds = districtContacts.map(c => c.id)
        
        // Use a more direct query to get all touchpoints for these contacts
        const { data: districtTouchpoints, error: dtError } = await supabaseAdmin
          .from('touchpoints')
          .select('*')
          .in('district_contact_id', districtContactIds)
        
        if (dtError) {
          console.error('Error fetching district contact touchpoints:', dtError)
          touchpointsErrorMessage = 'Error fetching district contact touchpoints'
        } else {
          touchpoints = districtTouchpoints || []
          console.log(`Found ${touchpoints.length} touchpoints for district contacts`)
        }
      } catch (error) {
        console.error('Error fetching touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching touchpoints'
      }
    } else {
      // Try to get touchpoints directly for the campaign
      try {
        // First get all leads for this campaign
        const { data: campaignLeads, error: leadsError } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('campaign_id', campaignId)
          
        if (!leadsError && campaignLeads && campaignLeads.length > 0) {
          const leadIds = campaignLeads.map(l => l.id)
          
          // Get touchpoints for these leads
          const { data: leadTouchpoints, error: ltError } = await supabaseAdmin
            .from('touchpoints')
            .select('*')
            .in('lead_id', leadIds)
            
          if (ltError) {
            console.error('Error fetching lead touchpoints:', ltError)
            touchpointsErrorMessage = 'Error fetching lead touchpoints'
          } else {
            touchpoints = leadTouchpoints || []
            console.log(`Found ${touchpoints.length} touchpoints for leads`)
          }
        }
      } catch (error) {
        console.error('Error fetching lead touchpoints:', error)
        touchpointsErrorMessage = 'Error fetching lead touchpoints'
      }
    }
    
    return NextResponse.json({
      campaign,
      district_leads: districtLeads || [],
      district_leads_count: districtLeads?.length || 0,
      district_contacts: districtContacts,
      district_contacts_count: districtContacts.length,
      contacts_error: contactsErrorMessage,
      touchpoints: touchpoints || [],
      touchpoints_count: touchpoints?.length || 0,
      touchpoints_error: touchpointsErrorMessage
    })
    
  } catch (error) {
    console.error('Error in campaign data API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 