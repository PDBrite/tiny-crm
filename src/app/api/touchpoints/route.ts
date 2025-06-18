import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { lead_id, type, subject, content, completed_at, outcome } = await request.json()
    
    if (!lead_id || !type) {
      return NextResponse.json(
        { error: 'Lead ID and type are required' },
        { status: 400 }
      )
    }

    // Create the touchpoint
    const { data: touchpoint, error } = await supabase
      .from('touchpoints')
      .insert({
        lead_id,
        type,
        subject,
        content,
        completed_at,
        outcome
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating touchpoint:', error)
      return NextResponse.json(
        { error: 'Failed to create touchpoint' },
        { status: 500 }
      )
    }

    // Update lead's last_contacted_at if this touchpoint has a completed_at date
    if (completed_at) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: completed_at })
        .eq('id', lead_id)
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