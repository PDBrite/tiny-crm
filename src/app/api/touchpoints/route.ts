import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

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