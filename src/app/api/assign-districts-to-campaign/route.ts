import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scheduleTouchpointsForLead } from '@/utils/outreach-scheduler'

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

    // Get campaign information including outreach sequence
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        outreach_sequence:outreach_sequences(
          *,
          steps:outreach_steps(*)
        )
      `)
      .eq('id', campaign_id)
      .single()

    if (campaignError) {
      console.error('Error fetching campaign:', campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign details', details: campaignError.message },
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
      .select('id, first_name, last_name, email, phone, district_lead_id')
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

    // If the campaign has an outreach sequence, create touchpoints for the contacts
    let touchpointsCreated = 0;
    if (campaign.outreach_sequence && campaign.outreach_sequence.steps && districtContacts && districtContacts.length > 0) {
      const campaignStartDate = new Date(campaign.start_date || campaign.created_at);
      const outreachSteps = campaign.outreach_sequence.steps;
      const touchpointsToCreate = [];
      
      // Get district information for each contact
      const districtLeadIds = [...new Set(districtContacts.map(contact => contact.district_lead_id))];
      const { data: districts } = await supabaseAdmin
        .from('district_leads')
        .select('id, district_name')
        .in('id', districtLeadIds);
      
      // Create a map of district_lead_id to district_name
      const districtNameMap = new Map();
      if (districts) {
        districts.forEach(district => {
          districtNameMap.set(district.id, district.district_name);
        });
      }
      
      // Create touchpoints for each contact
      for (const contact of districtContacts) {
        // Get district name to use as company name
        const districtName = districtNameMap.get(contact.district_lead_id) || '';
        
        // Schedule touchpoints for this contact
        const scheduledTouchpoints = scheduleTouchpointsForLead(
          { districtContactId: contact.id },
          campaignStartDate,
          outreachSteps,
          {
            first_name: contact.first_name,
            last_name: contact.last_name,
            company: districtName,
            city: ''
          }
        );
        
        // Filter touchpoints based on available contact methods
        const filteredTouchpoints = scheduledTouchpoints.filter(tp => {
          // Only schedule email touchpoints if contact has email
          if (tp.type === 'email') {
            return contact.email && contact.email.trim().length > 0;
          }
          // Only schedule call touchpoints if contact has phone
          if (tp.type === 'call') {
            return contact.phone && contact.phone.trim().length > 0;
          }
          // LinkedIn messages don't require email or phone
          return true;
        });
        
        touchpointsToCreate.push(...filteredTouchpoints);
      }
      
      // Insert touchpoints in batches to avoid timeouts
      if (touchpointsToCreate.length > 0) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < touchpointsToCreate.length; i += BATCH_SIZE) {
          const batch = touchpointsToCreate.slice(i, i + BATCH_SIZE);
          const { data, error: insertError } = await supabaseAdmin
            .from('touchpoints')
            .insert(batch)
            .select();
          
          if (insertError) {
            console.error(`Error inserting touchpoints batch ${Math.floor(i/BATCH_SIZE) + 1}:`, insertError);
          } else {
            touchpointsCreated += data?.length || 0;
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Districts assigned to campaign successfully',
      data: updatedDistricts,
      contacts: districtContacts,
      contacts_count: districtContacts?.length || 0,
      touchpoints_created: touchpointsCreated
    })

  } catch (error) {
    console.error('Error in assign-districts-to-campaign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 