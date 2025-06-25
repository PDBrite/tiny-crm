import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { lead_id, district_contact_id, type, subject, content, completed_at, outcome } = await request.json()
    
    if ((!lead_id && !district_contact_id) || !type) {
      return NextResponse.json(
        { error: 'Either lead_id or district_contact_id, and type are required' },
        { status: 400 }
      )
    }

    // Create the touchpoint with either lead_id or district_contact_id
    const touchpointData: any = {
      type,
      subject,
      content,
      completed_at,
      outcome
    }

    if (lead_id) {
      touchpointData.lead_id = lead_id
    } else if (district_contact_id) {
      touchpointData.district_contact_id = district_contact_id
    }

    const { data: touchpoint, error } = await supabase
      .from('touchpoints')
      .insert(touchpointData)
      .select()
      .single()

    if (error) {
      console.error('Error creating touchpoint:', error)
      return NextResponse.json(
        { error: 'Failed to create touchpoint' },
        { status: 500 }
      )
    }

    // Update last_contacted_at if this touchpoint has a completed_at date
    if (completed_at) {
      if (lead_id) {
        // Update regular lead
        await supabase
          .from('leads')
          .update({ last_contacted_at: completed_at })
          .eq('id', lead_id)
      } else if (district_contact_id) {
        // For district contacts, we could add a last_contacted_at field to district_contacts table
        // For now, we'll skip this since district_contacts might not have this field
        console.log('District contact touchpoint completed, but not updating last_contacted_at')
      }
    }

    return NextResponse.json({
      success: true,
      touchpoint,
      message: 'Touchpoint created successfully'
    })

  } catch (error) {
    console.error('Error creating touchpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 

export async function GET(request: NextRequest) {
  try {
    console.log('Touchpoints API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('Touchpoints API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('Touchpoints API: Session cookie found')
    }
    
    // Get query parameters
    const url = new URL(request.url)
    const leadId = url.searchParams.get('lead_id')
    const districtContactId = url.searchParams.get('district_contact_id')
    const campaignId = url.searchParams.get('campaign_id')
    const includeDetails = url.searchParams.get('include_details') === 'true'
    
    console.log('Touchpoints API: Query params:', { leadId, districtContactId, campaignId, includeDetails })

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }

    // Build query based on parameters
    let touchpointsData: any[] = []
    
    // Case 1: Filter by campaign_id
    if (campaignId) {
      console.log(`Fetching touchpoints for campaign: ${campaignId}`)
      
      // First check if this is an Avalern campaign
      const { data: campaignData, error: campaignError } = await supabaseAdmin
        .from('campaigns')
        .select('id, company')
        .eq('id', campaignId)
        .single()
      
      if (campaignError) {
        console.error('Error fetching campaign:', campaignError)
      } else {
        const isAvalern = campaignData.company === 'Avalern'
        console.log(`Campaign belongs to ${campaignData.company}`)
        
        if (isAvalern) {
          // For Avalern, first get all district leads for this campaign
          const { data: districtLeads, error: districtLeadsError } = await supabaseAdmin
            .from('district_leads')
            .select('id')
            .eq('campaign_id', campaignId)
          
          if (districtLeadsError) {
            console.error('Error fetching district leads:', districtLeadsError)
          } else {
            console.log(`Found ${districtLeads?.length || 0} district leads for campaign ${campaignId}`)
            
            if (districtLeads && districtLeads.length > 0) {
              // Get all district contacts for these leads
              const districtLeadIds = districtLeads.map(dl => dl.id)
              
              const { data: districtContacts, error: contactsError } = await supabaseAdmin
                .from('district_contacts')
                .select('id')
                .in('district_lead_id', districtLeadIds)
              
              if (contactsError) {
                console.error('Error fetching district contacts:', contactsError)
              } else {
                console.log(`Found ${districtContacts?.length || 0} district contacts`)
                
                if (districtContacts && districtContacts.length > 0) {
                  // Get touchpoints for these contacts
                  const contactIds = districtContacts.map(c => c.id)
                  
                  const { data: districtTouchpoints, error: districtError } = await supabaseAdmin
                    .from('touchpoints')
                    .select(`
                      *,
                      district_contact:district_contacts(
                        id,
                        first_name,
                        last_name,
                        email,
                        district_lead_id
                      )
                    `)
                    .in('district_contact_id', contactIds)
                    .order('scheduled_at', { ascending: true })
                  
                  if (districtError) {
                    console.error('Error fetching district touchpoints:', districtError)
                  } else {
                    console.log(`Found ${districtTouchpoints?.length || 0} district touchpoints`)
                    touchpointsData = [...touchpointsData, ...(districtTouchpoints || [])]
                  }
                }
              }
            }
          }
        }
      }
      
      // Then try regular leads
      const { data: leadTouchpoints, error: leadError } = await supabaseAdmin
        .from('touchpoints')
        .select(`
          *,
          lead:leads!inner(
            id,
            first_name,
            last_name,
            email,
            campaign_id
          )
        `)
        .eq('lead.campaign_id', campaignId)
        .order('scheduled_at', { ascending: true })
      
      if (leadError) {
        console.error('Error fetching lead touchpoints:', leadError)
      } else {
        console.log(`Found ${leadTouchpoints?.length || 0} lead touchpoints`)
        touchpointsData = [...touchpointsData, ...(leadTouchpoints || [])]
      }
    }
    // Case 2: Filter by lead_id
    else if (leadId) {
      const { data, error } = await supabaseAdmin
        .from('touchpoints')
        .select(includeDetails ? `
          *,
          lead:leads(id, first_name, last_name, email)
        ` : '*')
        .eq('lead_id', leadId)
        .order('scheduled_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching lead touchpoints:', error)
      } else {
        touchpointsData = data || []
      }
    }
    // Case 3: Filter by district_contact_id
    else if (districtContactId) {
      const { data, error } = await supabaseAdmin
        .from('touchpoints')
        .select(includeDetails ? `
          *,
          district_contact:district_contacts(id, first_name, last_name, email)
        ` : '*')
        .eq('district_contact_id', districtContactId)
        .order('scheduled_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching district contact touchpoints:', error)
      } else {
        touchpointsData = data || []
      }
    }
    
    console.log(`Found ${touchpointsData.length} touchpoints`)
    return NextResponse.json({
      touchpoints: touchpointsData,
      count: touchpointsData.length
    })
    
  } catch (error) {
    console.error('Error in touchpoints API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 