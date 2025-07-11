import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { TouchpointOutcome, TouchpointType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'today', 'overdue', or 'all'
    const date = url.searchParams.get('date') // Specific date in YYYY-MM-DD format
    const campaignId = url.searchParams.get('campaignId') // Filter by campaign
    
    // Determine company from session, not from query param for security
    let company: string | undefined;
    const requestedCompany = url.searchParams.get('company')
    
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
    
    // If specific date is provided, use that; otherwise use today
    let targetDate: Date
    if (date) {
      targetDate = new Date(date + 'T00:00:00.000Z')
    } else {
      targetDate = new Date()
      targetDate.setHours(0, 0, 0, 0)
    }
    
    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    let touchpoints = []
    
    if (company === 'Avalern') {
      // For Avalern, fetch touchpoints for district contacts
      console.log('Fetching Avalern district touchpoints for date:', date || 'today');
      
      // First get all campaigns for this company
      const campaigns = await prisma.campaign.findMany({
        where: {
          company: company as any
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const campaignIds = campaigns.map(c => c.id);
      const campaignMap = new Map();
      campaigns.forEach(c => campaignMap.set(c.id, c));
      
      // Then get district contacts for these campaigns
      const districtContacts = await prisma.districtContact.findMany({
        where: {
          campaignId: {
            in: campaignIds
          },
          ...(campaignId ? { campaignId } : {})
        },
        include: {
          district: true,
        }
      });
      
      console.log(`Found ${districtContacts.length} district contacts for Avalern`);
      
      // Create a map of district contacts for easy lookup
      const districtContactMap = new Map();
      districtContacts.forEach(dc => {
        districtContactMap.set(dc.id, dc);
      });
      
      // Build a list of district contact IDs
      const districtContactIds = districtContacts.map(dc => dc.id);
      
      // Define touchpoint where clause based on date/type
      let touchpointWhereClause: any = {
        completedAt: null,
        districtContactId: {
          in: districtContactIds
        }
      };
      
      // Apply date filters
      if (date) {
        touchpointWhereClause.scheduledAt = {
          gte: targetDate,
          lt: nextDay
        };
      } else if (type === 'today') {
        touchpointWhereClause.scheduledAt = {
          gte: targetDate,
          lt: nextDay
        };
      } else if (type === 'overdue') {
        touchpointWhereClause.scheduledAt = {
          lt: targetDate
        };
      } else {
        // Get both today and overdue
        touchpointWhereClause.scheduledAt = {
          lt: nextDay
        };
      }
      
      const districtTouchpoints = await prisma.touchpoint.findMany({
        where: touchpointWhereClause,
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      
      console.log(`Found ${districtTouchpoints.length} touchpoints for Avalern district contacts`);
      
      // Transform touchpoints to match the expected format
      touchpoints = districtTouchpoints.map(tp => {
        const dc = districtContactMap.get(tp.districtContactId);
        if (!dc) return null;
        
        const campaign = campaignMap.get(dc.campaignId);
        
        return {
          id: tp.id,
          type: tp.type,
          subject: tp.subject,
          content: tp.content,
          scheduled_at: tp.scheduledAt,
          completed_at: tp.completedAt,
          outcome: tp.outcome,
          created_at: tp.createdAt,
          district_contact_id: tp.districtContactId,
          district_contact: {
            id: dc.id,
            first_name: dc.firstName,
            last_name: dc.lastName,
            email: dc.email,
            phone: dc.phone,
            title: dc.title,
            district_lead: {
              id: dc.district.id,
              district_name: dc.district.name,
              county: dc.district.county,
              campaign_id: dc.campaignId
            }
          },
          // Add lead field for backward compatibility
          lead: {
            id: dc.id,
            first_name: dc.firstName,
            last_name: dc.lastName,
            email: dc.email,
            phone: dc.phone,
            city: dc.district.county,
            company: dc.district.name,
            campaign_id: dc.campaignId,
            campaign: campaign ? {
              id: campaign.id,
              name: campaign.name,
              company: company
            } : undefined
          }
        };
      }).filter(Boolean);
    } else {
      // For other companies (like CraftyCode), fetch regular lead touchpoints
      // First, get the campaigns for this company
      const campaigns = await prisma.campaign.findMany({
        where: {
          company: company as any
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const campaignIds = campaigns.map(c => c.id);
      const campaignMap = new Map();
      campaigns.forEach(c => campaignMap.set(c.id, c));
      
      // Then get leads for these campaigns
      const leads = await prisma.lead.findMany({
        where: {
          campaignId: {
            in: campaignIds
          },
          ...(campaignId ? { campaignId } : {})
        }
      });
      
      console.log(`Found ${leads.length} leads for ${company}`);
      
      // Create a map of leads for easy lookup
      const leadMap = new Map();
      leads.forEach(lead => {
        leadMap.set(lead.id, lead);
      });
      
      // Build a list of lead IDs
      const leadIds = leads.map(lead => lead.id);
      
      // Define touchpoint where clause based on date/type
      let touchpointWhereClause: any = {
        completedAt: null,
        leadId: {
          in: leadIds
        }
      };
      
      // Apply date filters
      if (date) {
        touchpointWhereClause.scheduledAt = {
          gte: targetDate,
          lt: nextDay
        };
      } else if (type === 'today') {
        touchpointWhereClause.scheduledAt = {
          gte: targetDate,
          lt: nextDay
        };
      } else if (type === 'overdue') {
        touchpointWhereClause.scheduledAt = {
          lt: targetDate
        };
      } else {
        // Get both today and overdue
        touchpointWhereClause.scheduledAt = {
          lt: nextDay
        };
      }
      
      const leadTouchpoints = await prisma.touchpoint.findMany({
        where: touchpointWhereClause,
        orderBy: {
          scheduledAt: 'asc'
        }
      });
      
      console.log(`Found ${leadTouchpoints.length} touchpoints for ${company} leads`);
      
      // Transform touchpoints to match the expected format
      touchpoints = leadTouchpoints.map(tp => {
        const lead = leadMap.get(tp.leadId);
        if (!lead) return null;
        
        const campaign = campaignMap.get(lead.campaignId);
        
        return {
          id: tp.id,
          type: tp.type,
          subject: tp.subject,
          content: tp.content,
          scheduled_at: tp.scheduledAt,
          completed_at: tp.completedAt,
          outcome: tp.outcome,
          created_at: tp.createdAt,
          lead_id: tp.leadId,
          lead: {
            id: lead.id,
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            city: lead.city,
            company: lead.company,
            campaign_id: lead.campaignId,
            campaign: campaign ? {
              id: campaign.id,
              name: campaign.name,
              company: company
            } : undefined
          }
        };
      }).filter(Boolean);
    }

    // If specific date is provided, return touchpoints for that date
    if (date) {
      return NextResponse.json({
        touchpoints: touchpoints,
        date: date,
        total: touchpoints.length
      })
    }

    // Legacy categorization for today/overdue
    const todayTouchpoints = []
    const overdueTouchpoints = []

    for (const touchpoint of touchpoints) {
      if (!touchpoint || !touchpoint.scheduled_at) continue;
      
      const scheduledDate = new Date(touchpoint.scheduled_at);
      scheduledDate.setHours(0, 0, 0, 0);

      if (scheduledDate < targetDate) {
        overdueTouchpoints.push(touchpoint)
      } else if (scheduledDate.getTime() === targetDate.getTime()) {
        todayTouchpoints.push(touchpoint)
      }
    }

    // Group by type for easier processing
    const groupedToday = groupTouchpointsByType(todayTouchpoints)
    const groupedOverdue = groupTouchpointsByType(overdueTouchpoints)

    return NextResponse.json({
      today: {
        total: todayTouchpoints.length,
        by_type: groupedToday,
        touchpoints: todayTouchpoints
      },
      overdue: {
        total: overdueTouchpoints.length,
        by_type: groupedOverdue,
        touchpoints: overdueTouchpoints
      },
      summary: {
        total_due: todayTouchpoints.length + overdueTouchpoints.length,
        emails_due: (groupedToday.email || 0) + (groupedOverdue.email || 0),
        calls_due: (groupedToday.call || 0) + (groupedOverdue.call || 0),
        linkedin_due: (groupedToday.linkedin_message || 0) + (groupedOverdue.linkedin_message || 0)
      }
    })

  } catch (error) {
    console.error('Error fetching daily touchpoints:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to mark touchpoints as completed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const allowedCompanies = session.user.allowedCompanies || [];

    const { touchpointId, outcome, outcomeEnum, notes } = await request.json()
    
    if (!touchpointId) {
      return NextResponse.json(
        { error: 'Touchpoint ID is required' },
        { status: 400 }
      )
    }

    // Security check: Verify the user has permission to update this touchpoint
    const touchpointToUpdate = await prisma.touchpoint.findUnique({
      where: { id: touchpointId },
      include: {
        lead: {
          select: {
            campaign: {
              select: { company: true }
            }
          }
        },
        districtContact: {
          select: {
            district: {
              select: {
                campaign: {
                  select: { company: true }
                }
              }
            }
          }
        }
      }
    });

    if (!touchpointToUpdate) {
      return NextResponse.json({ error: 'Touchpoint not found' }, { status: 404 });
    }
    
    // Type-safe access to company information
    let touchpointCompany: string | undefined;
    
    if (touchpointToUpdate.lead?.campaign?.company) {
      touchpointCompany = touchpointToUpdate.lead.campaign.company;
    } else if (touchpointToUpdate.districtContact?.district?.campaign?.company) {
      touchpointCompany = touchpointToUpdate.districtContact.district.campaign.company;
    }

    if (!touchpointCompany) {
       return NextResponse.json({ error: 'Could not determine touchpoint company' }, { status: 400 });
    }
    
    const touchpointCompanyNormalized = touchpointCompany.toLowerCase();

    if (!allowedCompanies.includes(touchpointCompanyNormalized)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (userRole === 'member' && touchpointCompanyNormalized !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the touchpoint
    const updatedTouchpoint = await prisma.touchpoint.update({
      where: { id: touchpointId },
      data: {
        completedAt: new Date(),
        outcome: outcome || null,
        outcomeEnum: outcomeEnum as TouchpointOutcome || null,
        content: notes ? `${notes}` : undefined
      }
    });

    // Get additional data needed for the response
    let leadData = null;
    let districtContactData = null;
    
    if (updatedTouchpoint.leadId) {
      const lead = await prisma.lead.update({
        where: { id: updatedTouchpoint.leadId },
        data: { lastContactedAt: new Date() },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      });
      
      leadData = {
        id: lead.id,
        email: lead.email,
        first_name: lead.firstName,
        last_name: lead.lastName
      };
    } else if (updatedTouchpoint.districtContactId) {
      const districtContact = await prisma.districtContact.findUnique({
        where: { id: updatedTouchpoint.districtContactId },
        include: {
          district: true
        }
      });
      
      if (districtContact) {
        // Update the district contact's lastContactedAt
        await prisma.districtContact.update({
          where: { id: districtContact.id },
          data: { lastContactedAt: new Date() }
        });
        
        districtContactData = {
          id: districtContact.id,
          email: districtContact.email,
          first_name: districtContact.firstName,
          last_name: districtContact.lastName,
          district_lead: {
            id: districtContact.district.id
          }
        };
      }
    }

    // Format the response
    const formattedTouchpoint = {
      ...updatedTouchpoint,
      completed_at: updatedTouchpoint.completedAt,
      scheduled_at: updatedTouchpoint.scheduledAt,
      created_at: updatedTouchpoint.createdAt,
      lead: leadData,
      district_contact: districtContactData
    };

    return NextResponse.json({
      success: true,
      touchpoint: formattedTouchpoint,
      message: 'Touchpoint marked as completed'
    });

  } catch (error) {
    console.error('Error completing touchpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function groupTouchpointsByType(touchpoints: any[]) {
  return touchpoints.reduce((acc, touchpoint) => {
    const type = touchpoint.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
}
