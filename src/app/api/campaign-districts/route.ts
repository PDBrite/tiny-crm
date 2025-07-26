import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CompanyType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    console.log('Campaign districts API called with URL:', request.url)
    
    // Get query parameters
    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const county = url.searchParams.get('county')
    const campaignId = url.searchParams.get('campaign_id')
    
    console.log('Campaign districts API: Query params:', { searchTerm, status, county, campaignId })

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Debug query - first check if the campaign exists
    if (campaignId) {
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { id: true, name: true, company: true }
        })
        
        if (!campaign) {
          console.error(`Campaign districts API: Campaign with ID ${campaignId} not found`)
        } else {
          console.log(`Campaign districts API: Found campaign: ${campaign?.name || 'Unknown'} (${campaign?.id || 'No ID'}) - Company: ${campaign?.company}`)
        }
        
        // Debug query - check if any districts have this campaign_id
        const districtCount = await prisma.districtContact.count({
          where: { campaignId }
        })
        
        console.log(`Campaign districts API: Found ${districtCount || 0} district contacts with campaign_id ${campaignId}`)
      } catch (error) {
        console.error('Error checking campaign:', error)
      }
    }

    // Build query to get districts with their contacts
    try {
      // First get all districts
      const districts = await prisma.district.findMany({
        where: {
          ...(searchTerm ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { county: { contains: searchTerm, mode: 'insensitive' } }
            ]
          } : {}),
          ...(county ? { county } : {})
        },
        include: {
          contacts: {
            where: {
              ...(campaignId ? { campaignId } : {}),
              ...(status ? { status: status as any } : {})
            }
          }
        },
        orderBy: { name: 'asc' }
      })
      
      // Format the response to match the expected structure
      const formattedDistricts = districts.map(district => {
        // Calculate contact counts
        const totalContacts = district.contacts.length;
        
        // Valid contacts are those with email addresses
        const validContacts = district.contacts.filter(contact => 
          contact.email && contact.email.trim() !== ''
        );
        
        return {
          id: district.id,
          district_name: district.name,
          county: district.county,
          state: district.state,
          district_type: district.type,
          size: district.size,
          budget: district.budget,
          website: district.website,
          notes: district.notes,
          campaign_id: campaignId || null,
          // Add contact counts
          contacts_count: totalContacts,
          valid_contacts_count: validContacts.length,
          district_contacts: district.contacts.map(contact => ({
            id: contact.id,
            first_name: contact.firstName,
            last_name: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            status: contact.status,
            title: contact.title
          }))
        };
      });

      // Add additional debug info
      if (formattedDistricts && formattedDistricts.length > 0) {
        console.log(`Found ${formattedDistricts.length} districts${campaignId ? ` for campaign ${campaignId}` : ''}`)
        console.log('Sample district data:', {
          id: formattedDistricts[0].id,
          name: formattedDistricts[0].district_name,
          campaign_id: formattedDistricts[0].campaign_id,
          contact_count: formattedDistricts[0].contacts_count,
          valid_contact_count: formattedDistricts[0].valid_contacts_count
        })
      } else {
        console.log(`Found ${formattedDistricts?.length || 0} districts${campaignId ? ` for campaign ${campaignId}` : ''}`)
      }
      
      return NextResponse.json({
        districts: formattedDistricts || [],
        count: formattedDistricts?.length || 0
      })
    } catch (error) {
      console.error('Error fetching districts with Prisma:', error)
      return NextResponse.json(
        { error: 'Failed to fetch districts', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in campaign districts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 