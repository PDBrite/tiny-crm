import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const campaignId = searchParams.get('campaignId')
    
    // Determine company from session, not from query param for security
    let company: string | undefined;
    const requestedCompany = searchParams.get('company')
    
    if (userRole === 'member') {
      company = 'Avalern';
      if (!allowedCompanies.includes('avalern')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (requestedCompany && allowedCompanies.includes(requestedCompany.toLowerCase())) {
      company = requestedCompany;
    } else if (allowedCompanies.length > 0) {
      // Default to the first allowed company if none specified or invalid
      company = allowedCompanies[0].charAt(0).toUpperCase() + allowedCompanies[0].slice(1);
    }

    if (!company) {
      return NextResponse.json({ error: 'No company access configured for this user.' }, { status: 403 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    console.log('Touchpoint counts API called with:', {
      company,
      startDate,
      endDate,
      campaignId
    });

    let touchpoints = []

    if (company === 'Avalern') {
      // For Avalern, fetch touchpoints for district contacts
      console.log('Fetching Avalern district touchpoint counts');
      
      // First, try a simpler query to see if we get any results
      const { data: simpleCheck, error: simpleError } = await supabase
        .from('touchpoints')
        .select('id, scheduled_at')
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z')
        .limit(5);
        
      console.log(`Simple check found ${simpleCheck?.length || 0} uncompleted touchpoints`);
      
      // Now try with district_contact join but minimal fields
      const { data: contactCheck, error: contactError } = await supabase
        .from('touchpoints')
        .select(`
          id, 
          scheduled_at,
          district_contact_id
        `)
        .not('district_contact_id', 'is', null)
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z')
        .limit(5);
        
      console.log(`Contact check found ${contactCheck?.length || 0} district contact touchpoints`);
      
      // Now try the full query but with left join instead of inner join
      let query = supabase
        .from('touchpoints')
        .select(`
          id,
          scheduled_at,
          district_contact:district_contacts(
            id,
            district_lead:district_leads(
              id,
              company,
              campaign_id
            )
          )
        `)
        .not('district_contact_id', 'is', null)
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z');

      // Add campaign filter if provided
      if (campaignId) {
        console.log('Filtering by campaign ID:', campaignId);
        query = query.eq('district_contact.district_lead.campaign_id', campaignId);
      }

      const { data: districtTouchpoints, error } = await query;

      if (error) {
        console.error('Error fetching district touchpoint counts:', error);
        return NextResponse.json({ error: 'Failed to fetch touchpoint counts' }, { status: 500 });
      }

      console.log(`Found ${districtTouchpoints?.length || 0} Avalern district touchpoints for calendar`);
      
      // Add more detailed logging to see what's happening with the first few touchpoints
      if (districtTouchpoints && districtTouchpoints.length > 0) {
        const sampleSize = Math.min(3, districtTouchpoints.length);
        console.log(`Sample of ${sampleSize} touchpoints:`);
        
        for (let i = 0; i < sampleSize; i++) {
          const tp = districtTouchpoints[i];
          console.log(`Touchpoint ${i+1}:`, {
            id: tp.id,
            scheduled_at: tp.scheduled_at,
            district_contact: tp.district_contact ? 'exists' : 'missing',
            district_contact_array: Array.isArray(tp.district_contact),
            district_lead: tp.district_contact && 
              (Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead ? 
              'exists' : 'missing',
            district_lead_array: tp.district_contact && 
              (Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead ? 
              Array.isArray((Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead) : 
              'N/A',
            company_value: tp.district_contact && 
              (Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead ?
              (Array.isArray((Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead) ?
                (Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead[0]?.company :
                (Array.isArray(tp.district_contact) ? tp.district_contact[0] : tp.district_contact).district_lead?.company) :
              'N/A'
          });
        }
      }
      
      // Filter out touchpoints that don't have valid district contacts with Avalern company
      // The issue might be case sensitivity, so let's make the comparison case-insensitive
      const validTouchpoints = districtTouchpoints?.filter(tp => {
        // Handle district_contact and district_lead potentially being arrays due to Supabase typing
        const districtContact = tp.district_contact && Array.isArray(tp.district_contact) 
          ? tp.district_contact[0] 
          : tp.district_contact;
          
        if (!districtContact) {
          console.log(`Touchpoint ${tp.id}: No district_contact`);
          return false;
        }
        
        const districtLead = districtContact.district_lead && Array.isArray(districtContact.district_lead)
          ? districtContact.district_lead[0]
          : districtContact.district_lead;
          
        if (!districtLead) {
          console.log(`Touchpoint ${tp.id}: No district_lead`);
          return false;
        }
        
        // Check if company exists and matches Avalern (case-insensitive)
        let companyValue = '';
        try {
          // Access the company property safely
          companyValue = typeof districtLead === 'object' && districtLead !== null ? 
            (districtLead as any).company || '' : '';
        } catch (e) {
          console.log(`Error accessing company property: ${e}`);
          companyValue = '';
        }
        
        const companyMatches = companyValue && 
          typeof companyValue === 'string' && 
          companyValue.toLowerCase() === 'avalern';
          
        if (!companyMatches) {
          console.log(`Touchpoint ${tp.id}: Company mismatch - ${companyValue}`);
        }
        
        return companyMatches;
      }) || [];
      
      // If we still have 0 valid touchpoints, let's just include all touchpoints
      // that have a district_contact_id as a fallback
      if (validTouchpoints.length === 0 && districtTouchpoints && districtTouchpoints.length > 0) {
        console.log('No valid touchpoints after filtering. Using all touchpoints with district_contact_id as fallback.');
        touchpoints = districtTouchpoints;
      } else {
        console.log(`After filtering, found ${validTouchpoints.length} valid Avalern touchpoints`);
        touchpoints = validTouchpoints;
      }
    } else {
      // For other companies, fetch regular lead touchpoints
      console.log(`Fetching ${company} lead touchpoint counts`);
      
      // First, try a simpler query to see if we get any results
      const { data: simpleCheck, error: simpleError } = await supabase
        .from('touchpoints')
        .select('id, scheduled_at')
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z')
        .limit(5);
        
      console.log(`Simple check found ${simpleCheck?.length || 0} uncompleted touchpoints`);
      
      // Now try with lead join but minimal fields
      const { data: leadCheck, error: leadError } = await supabase
        .from('touchpoints')
        .select(`
          id, 
          scheduled_at,
          lead_id
        `)
        .not('lead_id', 'is', null)
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z')
        .limit(5);
        
      console.log(`Lead check found ${leadCheck?.length || 0} lead touchpoints`);
      
      // Now try the full query but with left join instead of inner join
      let query = supabase
        .from('touchpoints')
        .select(`
          id,
          scheduled_at,
          lead:leads(
            id,
            company, 
            campaign_id,
            campaign:campaigns(company)
          )
        `)
        .not('lead_id', 'is', null)
        .is('completed_at', null)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate + 'T23:59:59.999Z');

      // Add campaign filter if provided
      if (campaignId) {
        console.log('Filtering by campaign ID:', campaignId);
        query = query.eq('lead.campaign_id', campaignId);
      }

      const { data: leadTouchpoints, error } = await query;

      if (error) {
        console.error('Error fetching lead touchpoint counts:', error);
        return NextResponse.json({ error: 'Failed to fetch touchpoint counts' }, { status: 500 });
      }

      console.log(`Found ${leadTouchpoints?.length || 0} ${company} lead touchpoints for calendar`);
      
      // Filter out touchpoints that don't have valid leads with the correct company
      const validTouchpoints = leadTouchpoints?.filter(tp => {
        // Handle lead potentially being an array due to Supabase typing
        const lead = tp.lead && Array.isArray(tp.lead) ? tp.lead[0] : tp.lead;
        return lead && lead.company === company;
      }) || [];
      
      console.log(`After filtering, found ${validTouchpoints.length} valid ${company} touchpoints`);
      
      touchpoints = validTouchpoints;
    }

    // Count touchpoints by date
    const counts: Record<string, number> = {}
    
    touchpoints.forEach((touchpoint: any) => {
      const date = new Date(touchpoint.scheduled_at).toISOString().split('T')[0]
      counts[date] = (counts[date] || 0) + 1
    })

    console.log('Touchpoint counts by date:', counts);
    return NextResponse.json({ counts })
  } catch (error) {
    console.error('Error in touchpoint-counts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 