import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        status: 401
      }, { status: 401 })
    }
    
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('district_leads')
      .select('count')
    
    // Test district query
    const { data: districts, error: districtsError } = await supabase
      .from('district_leads')
      .select('id, district_name, county, company')
      .eq('company', 'Avalern')
      .limit(5)
    
    return NextResponse.json({
      user: {
        email: session.user?.email,
        role: session.user?.role,
        allowedCompanies: session.user?.allowedCompanies
      },
      dbTest: {
        success: !testError,
        error: testError ? testError.message : null,
        data: testData
      },
      districtsTest: {
        success: !districtsError,
        error: districtsError ? districtsError.message : null,
        count: districts?.length || 0,
        data: districts
      }
    })
  } catch (error) {
    console.error('Error in test-company API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 