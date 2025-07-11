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
    let startDate = searchParams.get('startDate')
    let endDate = searchParams.get('endDate')
    const date = searchParams.get('date')
    const campaignId = searchParams.get('campaignId')
    
    // Handle single date parameter (for backward compatibility)
    if (date && (!startDate || !endDate)) {
      // If only date is provided, set start and end to the same day
      startDate = date
      endDate = date
    }
    
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
      return NextResponse.json({ error: 'Date information is required (either date or startDate+endDate)' }, { status: 400 })
    }

    // Parse the start and end dates
    const parsedStartDate = new Date(startDate);
    parsedStartDate.setHours(0, 0, 0, 0); // Set to start of day
    
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
        }
      };
      
      // First get all campaigns for this company
      const campaigns = await prisma.campaign.findMany({
        where: {
          company: company as any
        },
        select: {
          id: true
        }
      });
      
      const campaignIds = campaigns.map(c => c.id);
      
      // Then get district contacts for these campaigns
      const districtContacts = await prisma.districtContact.findMany({
        where: {
          campaignId: {
            in: campaignIds
          },
          ...(campaignId ? { campaignId } : {})
        },
        select: {
          id: true
        }
      });
      
      const districtContactIds = districtContacts.map(dc => dc.id);
      
      // Finally get touchpoints for these district contacts
      const districtTouchpoints = await prisma.touchpoint.findMany({
        where: {
          ...whereClause,
          districtContactId: {
            in: districtContactIds
          }
        },
        select: {
          id: true,
          scheduledAt: true,
          type: true
        }
      });
      
      touchpoints = districtTouchpoints;
    } else {
      // For other companies, get touchpoints for leads
      // First get all campaigns for this company
      const campaigns = await prisma.campaign.findMany({
        where: {
          company: company as any
        },
        select: {
          id: true
        }
      });
      
      const campaignIds = campaigns.map(c => c.id);
      
      // Then get leads for these campaigns
      const leads = await prisma.lead.findMany({
        where: {
          campaignId: {
            in: campaignIds
          },
          ...(campaignId ? { campaignId } : {})
        },
        select: {
          id: true
        }
      });
      
      const leadIds = leads.map(lead => lead.id);
      
      // Finally get touchpoints for these leads
      const leadTouchpoints = await prisma.touchpoint.findMany({
        where: {
          completedAt: null,
          scheduledAt: {
            gte: parsedStartDate,
            lte: parsedEndDate
          },
          leadId: {
            in: leadIds
          }
        },
        select: {
          id: true,
          scheduledAt: true,
          type: true
        }
      });
      
      touchpoints = leadTouchpoints;
    }

    // Count touchpoints by date and type
    const counts: Record<string, number> = {};
    const typeCountsByDate: Record<string, Record<string, number>> = {};
    
    touchpoints.forEach((touchpoint: any) => {
      const date = new Date(touchpoint.scheduledAt).toISOString().split('T')[0];
      const type = touchpoint.type;
      
      // Count by date
      counts[date] = (counts[date] || 0) + 1;
      
      // Count by type
      if (!typeCountsByDate[date]) {
        typeCountsByDate[date] = {};
      }
      typeCountsByDate[date][type] = (typeCountsByDate[date][type] || 0) + 1;
    });
    
    // If date parameter was used (single day), also return counts by type
    if (date) {
      const dateKey = date;
      return NextResponse.json({ 
        counts: typeCountsByDate[dateKey] || {} 
      });
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching touchpoint counts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
