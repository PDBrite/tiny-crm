import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, district_ids } = await request.json()

    if (!campaign_id || !district_ids || !Array.isArray(district_ids)) {
      return NextResponse.json(
        { error: 'Campaign ID and an array of district IDs are required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }

    // Update district_leads to associate them with the campaign
    const { data: updatedDistricts, error: updateError } = await supabaseAdmin
      .from('district_leads')
      .update({ 
        campaign_id: campaign_id,
        status: 'actively_contacting' 
      })
      .in('id', district_ids)
      .select()

    if (updateError) {
      console.error('Error assigning districts to campaign:', updateError)
      return NextResponse.json(
        { error: 'Failed to assign districts to campaign', details: updateError.message },
        { status: 500 }
      )
    }

    // Fetch all district contacts for these districts
    const { data: districtContacts, error: contactsError } = await supabaseAdmin
      .from('district_contacts')
      .select('id, first_name, last_name, district_lead_id')
      .in('district_lead_id', district_ids)

    if (contactsError) {
      console.error('Error fetching district contacts:', contactsError)
      return NextResponse.json({
        success: true,
        message: 'Districts assigned to campaign successfully, but failed to fetch contacts',
        data: updatedDistricts,
        contacts_error: contactsError.message
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Districts assigned to campaign successfully',
      data: updatedDistricts,
      contacts: districtContacts,
      contacts_count: districtContacts?.length || 0
    })

  } catch (error) {
    console.error('Error in assign-districts-to-campaign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 