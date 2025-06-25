import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign touchpoints API called with URL:', request.url)
    
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    const typeFilter = url.searchParams.get('type')
    const statusFilter = url.searchParams.get('status')
    
    console.log('Campaign touchpoints API: Query params:', { campaignId, typeFilter, statusFilter })

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable', message: 'Server-side Supabase client not initialized' },
        { status: 500 }
      )
    }

    // First, get the campaign to determine if it's Avalern or not
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, company')
      .eq('id', campaignId)
      .single()
      
    if (campaignError) {
      console.error(`Campaign touchpoints API: Error finding campaign with ID ${campaignId}:`, campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign', details: campaignError.message },
        { status: 500 }
      )
    }
    
    console.log(`Campaign touchpoints API: Found campaign: ${campaign?.name || 'Unknown'} (${campaign?.id || 'No ID'}) - Company: ${campaign?.company}`)
    
    let allTouchpoints = []
    
    // For Avalern campaigns, we need to get district contacts first
    if (campaign.company === 'Avalern') {
      // 1. Get all districts for this campaign
      const { data: districts, error: districtError } = await supabaseAdmin
        .from('district_leads')
        .select('id, district_name')
        .eq('campaign_id', campaignId)
        
      if (districtError) {
        console.error('Error fetching districts:', districtError)
        return NextResponse.json(
          { error: 'Failed to fetch districts', details: districtError.message },
          { status: 500 }
        )
      }
      
      console.log(`Found ${districts?.length || 0} districts for campaign ${campaignId}`)
      
      if (districts && districts.length > 0) {
        // 2. Get all district contacts for these districts
        const districtIds = districts.map(d => d.id)
        const { data: contacts, error: contactsError } = await supabaseAdmin
          .from('district_contacts')
          .select('id, first_name, last_name, email, district_lead_id')
          .in('district_lead_id', districtIds)
          
        if (contactsError) {
          console.error('Error fetching district contacts:', contactsError)
          return NextResponse.json(
            { error: 'Failed to fetch district contacts', details: contactsError.message },
            { status: 500 }
          )
        }
        
        console.log(`Found ${contacts?.length || 0} district contacts for campaign ${campaignId}`)
        
        // Create a map of district_id to district_name for enriching touchpoints
        const districtNameMap = new Map()
        districts.forEach(district => {
          districtNameMap.set(district.id, district.district_name)
        })
        
        // Create a map of contact_id to contact details for enriching touchpoints
        const contactDetailsMap = new Map()
        contacts.forEach(contact => {
          contactDetailsMap.set(contact.id, {
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            district_name: districtNameMap.get(contact.district_lead_id) || ''
          })
        })
        
        if (contacts && contacts.length > 0) {
          // 3. Get touchpoints for these contacts
          const contactIds = contacts.map(c => c.id)
          const { data: touchpoints, error: tpError } = await supabaseAdmin
            .from('touchpoints')
            .select('*')
            .in('district_contact_id', contactIds)
            
          if (tpError) {
            console.error('Error fetching touchpoints:', tpError)
            return NextResponse.json(
              { error: 'Failed to fetch touchpoints', details: tpError.message },
              { status: 500 }
            )
          }
          
          console.log(`Found ${touchpoints?.length || 0} touchpoints for district contacts`)
          
          // Enrich touchpoints with contact details
          const enrichedTouchpoints = touchpoints?.map(tp => {
            const contactDetails = contactDetailsMap.get(tp.district_contact_id) || {}
            return {
              ...tp,
              contact: {
                first_name: contactDetails.first_name,
                last_name: contactDetails.last_name,
                email: contactDetails.email,
                company: contactDetails.district_name
              },
              is_district_contact: true
            }
          }) || []
          
          allTouchpoints = enrichedTouchpoints
        }
      }
    } else {
      // For regular campaigns, get leads and their touchpoints
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, first_name, last_name, email, company')
        .eq('campaign_id', campaignId)
        
      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        return NextResponse.json(
          { error: 'Failed to fetch leads', details: leadsError.message },
          { status: 500 }
        )
      }
      
      console.log(`Found ${leads?.length || 0} leads for campaign ${campaignId}`)
      
      if (leads && leads.length > 0) {
        // Create a map of lead_id to lead details for enriching touchpoints
        const leadDetailsMap = new Map()
        leads.forEach(lead => {
          leadDetailsMap.set(lead.id, {
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            company: lead.company
          })
        })
        
        // Get touchpoints for these leads
        const leadIds = leads.map(l => l.id)
        const { data: touchpoints, error: tpError } = await supabaseAdmin
          .from('touchpoints')
          .select('*')
          .in('lead_id', leadIds)
          
        if (tpError) {
          console.error('Error fetching touchpoints:', tpError)
          return NextResponse.json(
            { error: 'Failed to fetch touchpoints', details: tpError.message },
            { status: 500 }
          )
        }
        
        console.log(`Found ${touchpoints?.length || 0} touchpoints for leads`)
        
        // Enrich touchpoints with lead details
        const enrichedTouchpoints = touchpoints?.map(tp => {
          const leadDetails = leadDetailsMap.get(tp.lead_id) || {}
          return {
            ...tp,
            contact: {
              first_name: leadDetails.first_name,
              last_name: leadDetails.last_name,
              email: leadDetails.email,
              company: leadDetails.company
            },
            is_district_contact: false
          }
        }) || []
        
        allTouchpoints = enrichedTouchpoints
      }
    }
    
    // Apply filters if provided
    let filteredTouchpoints = [...allTouchpoints]
    
    if (typeFilter) {
      filteredTouchpoints = filteredTouchpoints.filter(tp => tp.type === typeFilter)
    }
    
    if (statusFilter) {
      if (statusFilter === 'scheduled') {
        filteredTouchpoints = filteredTouchpoints.filter(tp => !tp.completed_at)
      } else if (statusFilter === 'completed') {
        filteredTouchpoints = filteredTouchpoints.filter(tp => tp.completed_at)
      }
    }
    
    // Sort touchpoints by scheduled date
    filteredTouchpoints.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.completed_at || 0).getTime()
      const dateB = new Date(b.scheduled_at || b.completed_at || 0).getTime()
      return dateA - dateB
    })
    
    return NextResponse.json({
      touchpoints: filteredTouchpoints,
      count: filteredTouchpoints.length,
      campaign_name: campaign.name,
      company: campaign.company
    })
    
  } catch (error) {
    console.error('Error in campaign touchpoints API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 