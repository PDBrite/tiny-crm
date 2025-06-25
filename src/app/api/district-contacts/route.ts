import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('District contacts API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('District contacts API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('District contacts API: Session cookie found')
    }
    
    /* Temporarily disabled full authentication check
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session) {
      console.log('District contacts API: No session found')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('District contacts API: Session found for user:', session.user?.email)
    
    // Only allow Avalern members or admins
    const userRole = session.user?.role
    const userCompanies = session.user?.allowedCompanies || []
    const canAccessAvalern = 
      userRole === 'admin' || 
      (userRole === 'member' && userCompanies.includes('avalern'))
    
    console.log('District contacts API: User role:', userRole, 'Companies:', userCompanies, 'Can access Avalern:', canAccessAvalern)
    
    if (!canAccessAvalern) {
      console.log('District contacts API: User not authorized for Avalern')
      return NextResponse.json(
        { error: 'Not authorized to access district contacts' },
        { status: 403 }
      )
    }
    */

    // Get query parameters
    const url = new URL(request.url)
    const districtId = url.searchParams.get('district_id')
    const status = url.searchParams.get('status')
    const searchTerm = url.searchParams.get('search')

    console.log('District contacts API: Query params:', { districtId, status, searchTerm })

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }

    // Build query
    let query = supabaseAdmin
      .from('district_contacts')
      .select(`
        *,
        district_lead:district_leads(
          id, 
          district_name, 
          county,
          status,
          campaign_id,
          company
        )
      `)
    
    // Apply filters if provided
    if (districtId) {
      query = query.eq('district_lead_id', districtId)
      console.log('District contacts API: Filtering by district_lead_id:', districtId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    }
    
    // Execute query
    const { data, error, count } = await query
      .order('created_at', { ascending: false })

    // Log sample data for debugging
    if (data && data.length > 0) {
      console.log('District contacts API: Sample contact data structure:', {
        id: data[0].id,
        name: `${data[0].first_name} ${data[0].last_name}`,
        district_lead: data[0].district_lead,
        has_district_data: !!data[0].district_lead
      })
    }

    console.log('District contacts API: Query result:', { 
      success: !error, 
      count: data?.length || 0, 
      error: error?.message || null,
      firstContact: data && data.length > 0 ? data[0].id : null
    })

    if (error) {
      console.error('Error fetching district contacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch district contacts' },
        { status: 500 }
      )
    }

    // Enrich with touchpoint counts
    const enrichedContacts = await Promise.all(
      (data || []).map(async (contact) => {
        try {
          // Check if supabaseAdmin is available
          if (!supabaseAdmin) {
            console.error('supabaseAdmin is not available for touchpoint counts')
            return contact
          }
          
          // Get completed touchpoints count
          const { count: completedCount, error: completedError } = await supabaseAdmin
            .from('touchpoints')
            .select('*', { count: 'exact', head: true })
            .eq('district_contact_id', contact.id)
            .not('completed_at', 'is', null)
            .not('outcome', 'is', null)
            
          if (completedError) {
            console.error('Error fetching completed touchpoints count:', completedError)
          }
          
          // Get scheduled touchpoints count
          const { count: scheduledCount, error: scheduledError } = await supabaseAdmin
            .from('touchpoints')
            .select('*', { count: 'exact', head: true })
            .eq('district_contact_id', contact.id)
            .is('completed_at', null)
            .not('scheduled_at', 'is', null)
            
          if (scheduledError) {
            console.error('Error fetching scheduled touchpoints count:', scheduledError)
          }
          
          return {
            ...contact,
            touchpoints_count: completedCount || 0,
            scheduled_touchpoints_count: scheduledCount || 0
          }
        } catch (err) {
          console.error('Error enriching contact with touchpoint counts:', err)
          return contact
        }
      })
    )

    return NextResponse.json({
      contacts: enrichedContacts || [],
      count: count || 0
    })
    
  } catch (error) {
    console.error('Error in district contacts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 