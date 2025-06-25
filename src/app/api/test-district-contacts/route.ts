import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Test district contacts API called')
    
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
    const districtId = url.searchParams.get('district_id')
    
    // Build query
    let query = supabaseAdmin.from('district_contacts')
    
    // Execute query with filters
    const { data, error } = await (districtId 
      ? query.select('*').eq('district_lead_id', districtId).limit(10)
      : query.select('*').limit(10))

    if (error) {
      console.error('Error in test district contacts API:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      contacts: data || []
    })
    
  } catch (error) {
    console.error('Error in test district contacts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 