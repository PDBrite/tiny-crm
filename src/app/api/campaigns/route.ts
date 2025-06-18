import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const company = url.searchParams.get('company')
    
    let query = supabase
      .from('campaigns')
      .select(`
        *,
        outreach_sequence:outreach_sequences(
          id,
          name,
          description
        )
      `)
    
    // Filter by company if specified
    if (company) {
      query = query.eq('company', company)
    }
    
    const { data: campaigns, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    return NextResponse.json(campaigns || [])

  } catch (error) {
    console.error('Error fetching campaigns:', error)
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

    const { data: campaign, error } = await supabase
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