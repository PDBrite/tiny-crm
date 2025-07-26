import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { District, DistrictContact, UserDistrictAssignment } from '@prisma/client';

interface DistrictWithRelations extends District {
  contacts: DistrictContact[];
  userAssignments: UserDistrictAssignment[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const county = searchParams.get('county');
    const searchTerm = searchParams.get('search');
    const campaignId = searchParams.get('campaignId');
    const assignedOnly = searchParams.get('assignedOnly') === 'true';

    // Get the current user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    // Build the query
    const query: any = {
      where: {
        ...(status ? { status } : {}),
        ...(county ? { county } : {}),
        ...(searchTerm ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { county: { contains: searchTerm, mode: 'insensitive' } }
          ]
        } : {}),
      },
      include: {
        contacts: {
          where: {
            ...(campaignId ? { campaignId } : {})
          }
        },
        userAssignments: true
      },
      orderBy: { name: 'asc' }
    };

    // If user is not an admin and assignedOnly is true, filter by user assignments
    if (userRole !== 'admin' && (assignedOnly || userId)) {
      query.where.userAssignments = {
        some: {
          userId: userId
        }
      };
    }

    // Execute the query
    const districts = await prisma.district.findMany(query) as DistrictWithRelations[];

    // Format the response to match the expected structure
    const formattedDistricts = districts.map(district => {
      // Calculate contact counts
      const totalContacts = district.contacts.length;
      
      // Valid contacts are those with email addresses
      const validContacts = district.contacts.filter(contact => 
        contact.email && contact.email.trim() !== ''
      );
      
      // Check if the district is assigned to the current user
      const isAssignedToCurrentUser = district.userAssignments.some(
        assignment => assignment.userId === userId
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
        // Add assignment info
        assigned_to_current_user: isAssignedToCurrentUser,
        assigned_users_count: district.userAssignments.length,
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

    return NextResponse.json({
      districts: formattedDistricts,
      totalCount: formattedDistricts.length
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch districts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin users can create districts
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, county, state, type, size, budget, website, notes } = body

    // Validate required fields
    if (!name || !county) {
      return NextResponse.json(
        { error: 'Name and county are required' },
        { status: 400 }
      )
    }

    // Create district using Prisma
    const district = await prisma.district.create({
      data: {
        name,
        county,
        state: state || 'California',
        type,
        size: size ? parseInt(size) : null,
        budget: budget ? parseFloat(budget) : null,
        website,
        notes
      }
    })

    return NextResponse.json({ district }, { status: 201 })
  } catch (error) {
    console.error('Error creating district:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 