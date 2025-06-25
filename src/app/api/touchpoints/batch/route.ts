import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { touchpoints } = data
    
    if (!Array.isArray(touchpoints) || touchpoints.length === 0) {
      return NextResponse.json(
        { error: 'Invalid touchpoints data. Expected non-empty array.' },
        { status: 400 }
      )
    }

    console.log(`Processing ${touchpoints.length} touchpoints in batch`)
    
    // Validate touchpoints
    for (const tp of touchpoints) {
      if (!tp.type) {
        return NextResponse.json(
          { error: 'Each touchpoint must have a type' },
          { status: 400 }
        )
      }
      
      // Ensure each touchpoint has either a lead_id or district_contact_id
      if (!tp.lead_id && !tp.district_contact_id) {
        return NextResponse.json(
          { error: 'Each touchpoint must have either lead_id or district_contact_id' },
          { status: 400 }
        )
      }
    }
    
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin client is not available')
      return NextResponse.json(
        { error: 'Database client unavailable' },
        { status: 500 }
      )
    }
    
    // Process district contact touchpoints first to get campaign info
    const districtContactTouchpoints = touchpoints.filter(tp => tp.district_contact_id);
    const leadTouchpoints = touchpoints.filter(tp => tp.lead_id);
    
    console.log(`Found ${districtContactTouchpoints.length} district contact touchpoints and ${leadTouchpoints.length} lead touchpoints`);
    
    // Get campaign information for district contact touchpoints if any exist
    if (districtContactTouchpoints.length > 0) {
      console.log('Processing district contact touchpoints');
      
      // Get all district contact IDs
      const districtContactIds = districtContactTouchpoints.map(tp => tp.district_contact_id);
      
      // Get district lead IDs for these contacts
      const { data: contacts, error: contactsError } = await supabaseAdmin
        .from('district_contacts')
        .select('id, district_lead_id')
        .in('id', districtContactIds);
      
      if (contactsError) {
        console.error('Error fetching district contacts:', contactsError);
        return NextResponse.json(
          { error: 'Failed to fetch district contacts' },
          { status: 500 }
        );
      }
      
      console.log(`Found ${contacts?.length || 0} district contacts`);
      
      // Create a mapping of contact ID to district lead ID
      const contactToDistrictLeadMap = new Map();
      contacts?.forEach(contact => {
        contactToDistrictLeadMap.set(contact.id, contact.district_lead_id);
      });
      
      // Insert touchpoints for district contacts
      const { data: insertedDistrictTouchpoints, error: insertError } = await supabaseAdmin
        .from('touchpoints')
        .insert(districtContactTouchpoints)
        .select();
      
      if (insertError) {
        console.error('Error inserting district contact touchpoints:', insertError);
        return NextResponse.json(
          { error: 'Failed to insert district contact touchpoints' },
          { status: 500 }
        );
      }
      
      console.log(`Successfully inserted ${insertedDistrictTouchpoints?.length || 0} district contact touchpoints`);
    }
    
    // Insert lead touchpoints
    if (leadTouchpoints.length > 0) {
      console.log('Processing lead touchpoints');
      const { data: insertedLeadTouchpoints, error: insertError } = await supabaseAdmin
        .from('touchpoints')
        .insert(leadTouchpoints)
        .select();
      
      if (insertError) {
        console.error('Error inserting lead touchpoints:', insertError);
        return NextResponse.json(
          { error: 'Failed to insert lead touchpoints' },
          { status: 500 }
        );
      }
      
      console.log(`Successfully inserted ${insertedLeadTouchpoints?.length || 0} lead touchpoints`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${touchpoints.length} touchpoints`
    })
  } catch (error) {
    console.error('Error creating touchpoints batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 