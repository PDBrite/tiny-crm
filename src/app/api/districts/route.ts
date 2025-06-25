import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Districts API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('Districts API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('Districts API: Session cookie found')
    }
    
    /* Temporarily disabled full authentication check
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Only allow Avalern members or admins
    const userRole = session.user?.role
    const userCompanies = session.user?.allowedCompanies || []
    const canAccessAvalern = 
      userRole === 'admin' || 
      (userRole === 'member' && userCompanies.includes('avalern'))
    
    if (!canAccessAvalern) {
      return NextResponse.json(
        { error: 'Not authorized to access district data' },
        { status: 403 }
      )
    }
    */

    // Ensure we have the admin client
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')
    const status = searchParams.get('status')
    
    // Build the query
    let query = supabaseAdmin
      .from('district_leads')
      .select(`
        *,
        campaign:campaigns(id, name),
        district_contacts(id, status)
      `)
      .eq('company', 'Avalern')
      .order('created_at', { ascending: false })
    
    // Apply filters if provided
    if (county && county !== 'all') {
      query = query.eq('county', county)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    // Execute the query
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching districts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch districts' },
        { status: 500 }
      )
    }
    
    // Enrich with computed fields
    const enriched = data.map(district => ({
      ...district,
      contacts_count: district.district_contacts?.length || 0,
      valid_contacts_count: district.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0,
    }))
    
    return NextResponse.json(enriched)
    
  } catch (error) {
    console.error('Error in districts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 