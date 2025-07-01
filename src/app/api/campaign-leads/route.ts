import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign leads API called with URL:', request.url)
    
    // Get authentication cookie
    const sessionCookie = request.cookies.get('next-auth.session-token')?.value
    
    if (!sessionCookie) {
      console.log('Campaign leads API: No session cookie found')
      // Continue anyway for now, but in production we would return 401
      // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    } else {
      console.log('Campaign leads API: Session cookie found')
    }
    
    // Get query parameters
    const url = new URL(request.url)
    const campaignId = url.searchParams.get('campaign_id')
    const company = url.searchParams.get('company')
    
    console.log('Campaign leads API: Query params:', { campaignId, company })

    // If no company is specified, return all leads
    if (!company && !campaignId) {
      const leads = await prisma.lead.findMany({
        include: {
          campaign: true,
          touchpoints: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform to match expected format
      const transformedLeads = leads.map(lead => ({
        id: lead.id,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        city: lead.city || '',
        state: lead.state || '',
        company: lead.company || '',
        linkedin_url: lead.linkedinUrl || '',
        website_url: lead.websiteUrl || '',
        online_profile: lead.onlineProfile || '',
        source: lead.source || '',
        status: lead.status,
        notes: lead.notes || '',
        campaign_id: lead.campaignId || null,
        campaign: lead.campaign ? {
          id: lead.campaign.id,
          name: lead.campaign.name
        } : null,
        created_at: lead.createdAt,
        last_contacted_at: lead.lastContactedAt,
        touchpoints_count: lead.touchpoints.length,
        is_district_contact: false
      }));

      return NextResponse.json({
        leads: transformedLeads,
        count: transformedLeads.length
      });
    }

    // If a campaign ID is provided, get leads for that campaign
    if (campaignId) {
      // First, get the campaign to determine its company
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      const isAvalern = campaign.company === 'Avalern';
      console.log(`Campaign belongs to ${campaign.company}`);

      if (isAvalern) {
        // For Avalern campaigns, fetch district contacts
        console.log('Fetching Avalern district contacts for campaign:', campaignId);

        const districtContacts = await prisma.districtContact.findMany({
          where: {
            campaignId: campaignId
          },
          include: {
            district: true,
            touchpoints: true
          }
        });

        console.log(`Found ${districtContacts.length} district contacts`);

        // Transform district contacts to match lead structure
        const transformedContacts = districtContacts.map(contact => ({
          id: contact.id,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.district?.name || '',
          district_lead_id: contact.districtId,
          status: contact.status,
          notes: contact.notes || '',
          title: contact.title,
          city: '', // District contacts don't have city/state
          state: contact.state || 'California',
          linkedin_url: contact.linkedinUrl || '',
          website_url: '',
          source: 'District Import',
          contact_attempts_count: contact.touchpoints.length,
          last_contacted_at: contact.lastContactedAt,
          is_district_contact: true
        }));

        return NextResponse.json({
          leads: transformedContacts,
          count: transformedContacts.length
        });
      } else {
        // For other companies, fetch regular leads
        const leads = await prisma.lead.findMany({
          where: {
            campaignId: campaignId
          },
          include: {
            touchpoints: true
          }
        });

        // Transform leads to match expected format
        const transformedLeads = leads.map(lead => ({
          id: lead.id,
          first_name: lead.firstName,
          last_name: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          city: lead.city || '',
          state: lead.state || '',
          company: lead.company || '',
          linkedin_url: lead.linkedinUrl || '',
          website_url: lead.websiteUrl || '',
          online_profile: lead.onlineProfile || '',
          source: lead.source || '',
          status: lead.status,
          notes: lead.notes || '',
          campaign_id: lead.campaignId,
          created_at: lead.createdAt,
          last_contacted_at: lead.lastContactedAt,
          touchpoints_count: lead.touchpoints.length,
          is_district_contact: false
        }));

        console.log(`Found ${transformedLeads.length} leads for campaign ${campaignId}`);
        return NextResponse.json({
          leads: transformedLeads,
          count: transformedLeads.length
        });
      }
    }

    // If only company is specified, get all leads for that company
    if (company) {
      if (company === 'Avalern') {
        // For Avalern, get all district contacts
        const districtContacts = await prisma.districtContact.findMany({
          include: {
            district: true,
            touchpoints: true
          }
        });

        // Transform district contacts to match lead structure
        const transformedContacts = districtContacts.map(contact => ({
          id: contact.id,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          company: contact.district?.name || '',
          district_lead_id: contact.districtId,
          status: contact.status,
          notes: contact.notes || '',
          title: contact.title,
          city: '', // District contacts don't have city/state
          state: contact.state || 'California',
          linkedin_url: contact.linkedinUrl || '',
          website_url: '',
          source: 'District Import',
          campaign_id: contact.campaignId,
          created_at: contact.createdAt,
          last_contacted_at: contact.lastContactedAt,
          touchpoints_count: contact.touchpoints.length,
          is_district_contact: true
        }));

        return NextResponse.json({
          leads: transformedContacts,
          count: transformedContacts.length
        });
      } else {
        // For other companies, get regular leads
        const leads = await prisma.lead.findMany({
          where: {
            company: company
          },
          include: {
            touchpoints: true,
            campaign: true
          }
        });

        // Transform leads to match expected format
        const transformedLeads = leads.map(lead => ({
          id: lead.id,
          first_name: lead.firstName,
          last_name: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          city: lead.city || '',
          state: lead.state || '',
          company: lead.company || '',
          linkedin_url: lead.linkedinUrl || '',
          website_url: lead.websiteUrl || '',
          online_profile: lead.onlineProfile || '',
          source: lead.source || '',
          status: lead.status,
          notes: lead.notes || '',
          campaign_id: lead.campaignId,
          campaign: lead.campaign ? {
            id: lead.campaign.id,
            name: lead.campaign.name
          } : null,
          created_at: lead.createdAt,
          last_contacted_at: lead.lastContactedAt,
          touchpoints_count: lead.touchpoints.length,
          is_district_contact: false
        }));

        return NextResponse.json({
          leads: transformedLeads,
          count: transformedLeads.length
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in campaign leads API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, firstName, lastName, email, phone, city, state, company,
      linkedinUrl, websiteUrl, onlineProfile, source, status, notes, campaignId
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Update lead with Prisma
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        city,
        state,
        company,
        linkedinUrl,
        websiteUrl,
        onlineProfile,
        source,
        status,
        notes,
        campaignId
      }
    });

    // Transform to match expected format
    const transformedLead = {
      id: updatedLead.id,
      first_name: updatedLead.firstName,
      last_name: updatedLead.lastName,
      email: updatedLead.email,
      phone: updatedLead.phone,
      city: updatedLead.city,
      state: updatedLead.state,
      company: updatedLead.company,
      linkedin_url: updatedLead.linkedinUrl,
      website_url: updatedLead.websiteUrl,
      online_profile: updatedLead.onlineProfile,
      source: updatedLead.source,
      status: updatedLead.status,
      notes: updatedLead.notes,
      campaign_id: updatedLead.campaignId
    };

    return NextResponse.json({ lead: transformedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to update lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
