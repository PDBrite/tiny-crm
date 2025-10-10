import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRoleType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const allowedCompanies = session.user.allowedCompanies || [];

    // Parse query parameters
    const url = new URL(request.url);
    const districtContactId = url.searchParams.get('district_contact_id');
    const includeDetails = url.searchParams.get('include_details') === 'true';
    
    console.log('District Contact Touchpoints API: Query params:', { districtContactId, includeDetails });

    if (!districtContactId) {
      return NextResponse.json(
        { error: 'Missing district_contact_id parameter' },
        { status: 400 }
      );
    }

    // Get the district contact to check permissions
    const districtContact = await prisma.districtContact.findUnique({
      where: { id: districtContactId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        campaignId: true,
        campaign: {
          select: {
            company: true
          }
        }
      }
    });

    if (!districtContact) {
      return NextResponse.json({ error: 'District contact not found' }, { status: 404 });
    }

    // Check permissions if there's a campaign
    if (districtContact.campaign) {
      const company = districtContact.campaign.company.toLowerCase();
      
      if (!allowedCompanies.includes(company)) {
        return NextResponse.json({ error: 'Forbidden - company access' }, { status: 403 });
      }

      if (userRole === UserRoleType.member && company !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden - role restriction' }, { status: 403 });
      }
    }

    // Fetch touchpoints for this district contact
    // const touchpoints = await prisma.touchpoint.findMany({
    //   where: { 
    //     districtContactId: districtContactId 
    //   },
    //   orderBy: { 
    //     scheduledAt: 'asc' 
    //   }
    // });
    const touchpoints = await prisma.touchpoint.findMany({
      where: { 
        districtContactId: districtContactId 
      },
      include: {  // ADD THIS WHOLE BLOCK
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { 
        scheduledAt: 'asc' 
      }
    });
    // Format the touchpoints
    const formattedTouchpoints = touchpoints.map(tp => ({
      id: tp.id,
      type: tp.type,
      subject: tp.subject,
      content: tp.content,
      scheduled_at: tp.scheduledAt,
      completed_at: tp.completedAt,
      outcome: tp.outcome,
      created_at: tp.createdAt,
      district_contact_id: tp.districtContactId,
      district_contact: includeDetails ? {
        id: districtContact.id,
        first_name: districtContact.firstName,
        last_name: districtContact.lastName,
        email: districtContact.email,
        title: districtContact.title
      } : undefined
    }));

    return NextResponse.json({
      touchpoints: formattedTouchpoints,
      count: formattedTouchpoints.length
    });
  } catch (error) {
    console.error('Error fetching district contact touchpoints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
 