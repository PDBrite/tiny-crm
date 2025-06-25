import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign districts API called with URL:', request.url)
    
    // Get query parameters
    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const county = url.searchParams.get('county')
    const campaignId = url.searchParams.get('campaign_id')
    
    console.log('Campaign districts API: Query params:', { searchTerm, status, county, campaignId })

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable', message: 'Server-side Supabase client not initialized' },
        { status: 500 }
      )
    }

    // Debug query - first check if the campaign exists
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from('campaigns')
        .select('id, name, company')
        .eq('id', campaignId)
        .single()
        
      if (campaignError) {
        console.error(`Campaign districts API: Error finding campaign with ID ${campaignId}:`, campaignError)
      } else {
        console.log(`Campaign districts API: Found campaign: ${campaign?.name || 'Unknown'} (${campaign?.id || 'No ID'}) - Company: ${campaign?.company}`)
      }
      
      // Debug query - check if any districts have this campaign_id
      const { count: districtCount, error: countError } = await supabaseAdmin
        .from('district_leads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        
      if (countError) {
        console.error(`Campaign districts API: Error counting districts with campaign_id ${campaignId}:`, countError)
      } else {
        console.log(`Campaign districts API: Found ${districtCount || 0} districts with campaign_id ${campaignId}`)
      }
    }

    // Build query
    let query = supabaseAdmin
      .from('district_leads')
      .select(`
        *,
        district_contacts(id, first_name, last_name, email, phone, status, title)
      `)
    
    // Apply campaign filter if provided
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
      console.log(`Campaign districts API: Filtering by campaign_id: ${campaignId}`)
    } else {
      // If no campaign ID, filter by company
      query = query.eq('company', 'Avalern')
    }
    
    // Apply other filters if provided
    if (status) {
      query = query.eq('status', status)
    }
    
    if (county) {
      query = query.eq('county', county)
    }
    
    if (searchTerm) {
      query = query.or(`district_name.ilike.%${searchTerm}%,county.ilike.%${searchTerm}%`)
    }

    // Execute the query with ordering
    const { data, error } = await query.order('district_name', { ascending: true })

    if (error) {
      console.error('Error fetching districts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch districts', details: error.message },
        { status: 500 }
      )
    }

    // Add additional debug info
    if (data && data.length > 0) {
      console.log(`Found ${data.length} districts${campaignId ? ` for campaign ${campaignId}` : ''}`)
      console.log('Sample district data:', {
        id: data[0].id,
        name: data[0].district_name,
        campaign_id: data[0].campaign_id,
        contact_count: data[0].district_contacts?.length || 0
      })
    } else {
      console.log(`Found ${data?.length || 0} districts${campaignId ? ` for campaign ${campaignId}` : ''}`)
      
      // If no districts found with campaign_id, check if any exist at all
      if (campaignId) {
        const { data: allDistricts, error: allError } = await supabaseAdmin
          .from('district_leads')
          .select('id, district_name, campaign_id', { count: 'exact' })
          .limit(5)
          
        if (allError) {
          console.error('Error checking for any districts:', allError)
        } else {
          console.log(`Found ${allDistricts?.length || 0} sample districts in the database:`, 
            allDistricts?.map(d => ({ id: d.id, name: d.district_name, campaign_id: d.campaign_id })) || []
          )
        }
      }
    }
    
    return NextResponse.json({
      districts: data || [],
      count: data?.length || 0
    })
    
  } catch (error) {
    console.error('Error in campaign districts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 