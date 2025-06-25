import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaigns API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('Campaigns API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('Campaigns API: Session cookie found')
    }
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const company = url.searchParams.get('company')
    
    // Only require company parameter for client-side requests
    // Server-side requests might not have company context yet
    if (!company && request.headers.get('sec-fetch-dest') !== 'script') {
      console.log('No company parameter provided, but continuing for server-side requests')
      // Return empty array instead of error for server-side or initial requests
      return NextResponse.json([])
    }
    
    console.log('Fetching campaigns for company:', company || 'all')
    
    // Build query
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        outreach_sequence:outreach_sequences(
          id,
          name,
          description
        )
      `)
      .eq('company', company)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    console.log(`Found ${data?.length || 0} campaigns for company: ${company}`)
    return NextResponse.json(data || [])
    
  } catch (error) {
    console.error('Error in campaigns API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, company, description, outreach_sequence_id } = await request.json()
    
    if (!name || !company) {
      return NextResponse.json(
        { error: 'Name and company are required' },
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

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name,
        company,
        description,
        outreach_sequence_id,
        start_date: new Date().toISOString().split('T')[0] // Today's date
      })
      .select(`
        *,
        outreach_sequence:outreach_sequences(
          id,
          name,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    return NextResponse.json(campaign)

  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 