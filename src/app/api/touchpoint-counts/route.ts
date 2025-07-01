import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    // Parse the start and end dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    parsedEndDate.setHours(23, 59, 59, 999); // Set to end of day
    
    let touchpoints = [];
    
    if (company === 'Avalern') {
      // For Avalern, get touchpoints for district contacts
      let whereClause: any = {
        completedAt: null,
        scheduledAt: {
          gte: parsedStartDate,
          lte: parsedEndDate
        },
        districtContact: {
          district: {
            campaign: {
              company: 'Avalern'
            }
          }
        }
      };
      
      // Add campaign filter if provided
      if (campaignId) {
        whereClause.districtContact.district.campaignId = campaignId;
      }
      
      const districtTouchpoints = await prisma.touchpoint.findMany({
        where: whereClause,
        select: {
          id: true,
          scheduledAt: true
        }
      });
      
      touchpoints = districtTouchpoints;
    } else {
      // For other companies, get touchpoints for leads
      let whereClause: any = {
        completedAt: null,
        scheduledAt: {
          gte: parsedStartDate,
          lte: parsedEndDate
        },
        lead: {
          campaign: {
            company: company
          }
        }
      };
      
      // Add campaign filter if provided
      if (campaignId) {
        whereClause.lead.campaignId = campaignId;
      }
      
      const leadTouchpoints = await prisma.touchpoint.findMany({
        where: whereClause,
        select: {
          id: true,
          scheduledAt: true
        }
      });
      
      touchpoints = leadTouchpoints;
    }

    // Count touchpoints by date
    const counts: Record<string, number> = {};
    
    touchpoints.forEach((touchpoint: any) => {
      const date = new Date(touchpoint.scheduledAt).toISOString().split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching touchpoint counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
