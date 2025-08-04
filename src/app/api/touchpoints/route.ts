import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { TouchpointType, UserRoleType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []
    const userId = session.user.id // Get the user ID from the session

    const { lead_id, district_contact_id, type, subject, content, completed_at, outcome, scheduled_at } = await request.json()
    
    if ((!lead_id && !district_contact_id) || !type) {
      return NextResponse.json(
        { error: 'Either lead_id or district_contact_id, and type are required' },
        { status: 400 }
      )
    }

    // Security check: Verify the user has permission to create touchpoints for this lead/contact
    if (lead_id) {
      const lead = await prisma.lead.findUnique({
        where: { id: lead_id },
        select: {
          campaign: {
            select: { company: true }
          }
        }
      });

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      if (!lead.campaign) {
        return NextResponse.json({ error: 'Lead not associated with a campaign' }, { status: 400 })
      }

      const leadCompany = lead.campaign.company.toLowerCase()
      if (!allowedCompanies.includes(leadCompany)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (userRole === 'member' && leadCompany !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (district_contact_id) {
      const districtContact = await prisma.districtContact.findUnique({
        where: { id: district_contact_id },
        select: {
          campaign: {
            select: { company: true }
          }
        }
      });

      if (!districtContact) {
        return NextResponse.json({ error: 'District contact not found' }, { status: 404 })
      }

      // Allow creating touchpoints for district contacts even without campaigns
      // For Avalern, district contacts are always allowed
      if (userRole === 'member' && !allowedCompanies.includes('avalern')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Create the touchpoint with either lead_id or district_contact_id
    const touchpoint = await prisma.touchpoint.create({
      data: {
        type: type as TouchpointType,
        subject: subject || null,
        content: content || null,
        completedAt: completed_at ? new Date(completed_at) : null,
        outcome: outcome || null,
        leadId: lead_id || null,
        districtContactId: district_contact_id || null,
        scheduledAt: scheduled_at ? new Date(scheduled_at) : new Date(), // Use provided scheduled_at or default to current time
        createdById: userId // Store the user ID of the creator
      }
    });

    // Update last_contacted_at if this touchpoint has a completed_at date
    if (completed_at) {
      if (lead_id) {
        // Update regular lead
        await prisma.lead.update({
          where: { id: lead_id },
          data: { lastContactedAt: new Date(completed_at) }
        });
      } else if (district_contact_id) {
        // For district contacts, update the contact's lastContactedAt
        await prisma.districtContact.update({
          where: { id: district_contact_id },
          data: { lastContactedAt: new Date(completed_at) }
        });
      }
    }

    // Format the response to match the expected structure
    const formattedTouchpoint = {
      ...touchpoint,
      scheduled_at: touchpoint.scheduledAt,
      completed_at: touchpoint.completedAt,
      created_at: touchpoint.createdAt,
      lead_id: touchpoint.leadId,
      district_contact_id: touchpoint.districtContactId
    };

    return NextResponse.json({
      success: true,
      touchpoint: formattedTouchpoint,
      message: 'Touchpoint created successfully'
    })

  } catch (error) {
    console.error('Error creating touchpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 

export async function GET(request: NextRequest) {
  try {
    // Check authentication (optional)
    const session = await getServerSession(authOptions);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const districtContactIds = searchParams.get('district_contact_ids');
    const districtContactId = searchParams.get('district_contact_id');
    const completed = searchParams.get('completed') === 'true';
    const scheduled = searchParams.get('scheduled') === 'true';
    const leadId = searchParams.get('lead_id');
    const includeDetails = searchParams.get('include_details') === 'true';
    const createdById = searchParams.get('created_by_id');

    if (!districtContactIds && !districtContactId && !leadId) {
      return NextResponse.json({ error: 'Missing district_contact_ids, district_contact_id, or lead_id parameter' }, { status: 400 });
    }

    // Build the query
    const query: any = {
      where: {},
          include: {
        districtContact: { 
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            title: true 
          } 
        },
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {}
    };

    // Set up the where conditions
    if (districtContactIds) {
      const ids = districtContactIds.split(',');
      query.where.districtContactId = { in: ids };
    } else if (districtContactId) {
      query.where.districtContactId = districtContactId;
    } else if (leadId) {
      query.where.leadId = leadId;
    }

    // Apply status filters
    if (completed) {
      query.where.completedAt = { not: null };
      query.orderBy.completedAt = 'desc';
    } else if (scheduled) {
      query.where.completedAt = null;
      query.where.scheduledAt = { not: null };
      query.orderBy.scheduledAt = 'asc';
    }
    
    // Filter by creator if specified
    if (createdById) {
      query.where.createdById = createdById;
    }
    
    // For member users, restrict to their own touchpoints if not specifically querying by ID
    if (session?.user?.role === UserRoleType.member && !districtContactId && !leadId && !districtContactIds) {
      query.where.createdById = session.user.id;
    }

    // Execute the query
    const touchpoints = await prisma.touchpoint.findMany(query);

    // Format the response
    const formattedTouchpoints = touchpoints.map(tp => ({
        id: tp.id,
        type: tp.type,
        subject: tp.subject,
        content: tp.content,
        scheduled_at: tp.scheduledAt,
        completed_at: tp.completedAt,
        outcome: tp.outcome,
        created_at: tp.createdAt,
        lead_id: tp.leadId,
      district_contact_id: tp.districtContactId,
      created_by_id: tp.createdById,
      created_by: tp.createdBy ? {
        id: tp.createdBy.id,
        email: tp.createdBy.email,
        first_name: tp.createdBy.firstName,
        last_name: tp.createdBy.lastName,
        role: tp.createdBy.role
      } : null,
      lead: tp.lead ? {
        id: tp.lead.id,
        first_name: tp.lead.firstName,
        last_name: tp.lead.lastName,
        email: tp.lead.email
      } : null,
      district_contact: tp.districtContact ? {
        id: tp.districtContact.id,
        first_name: tp.districtContact.firstName,
        last_name: tp.districtContact.lastName,
        email: tp.districtContact.email,
        title: tp.districtContact.title
      } : null
    }));

    return NextResponse.json({ touchpoints: formattedTouchpoints });
  } catch (error) {
    console.error('Error fetching touchpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    const allowedCompanies = session.user.allowedCompanies || [];

    const { id, status, completed_at, outcome } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Touchpoint ID is required' },
        { status: 400 }
      );
    }

    // Security check: Verify the user has permission to update this touchpoint
    const touchpointToUpdate = await prisma.touchpoint.findUnique({
      where: { id },
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
            campaign: {
              select: { company: true }
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
    } else if (touchpointToUpdate.districtContact?.campaign?.company) {
      touchpointCompany = touchpointToUpdate.districtContact.campaign.company;
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
      where: { id },
      data: {
        completedAt: completed_at ? new Date(completed_at) : new Date(),
        outcome: status || outcome || null
      },
      include: {
        lead: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        districtContact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            district: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    // Update appropriate record's last_contacted_at
    if (updatedTouchpoint.leadId) {
      await prisma.lead.update({
        where: { id: updatedTouchpoint.leadId },
        data: { lastContactedAt: new Date() }
      });
    } else if (updatedTouchpoint.districtContactId && updatedTouchpoint.districtContact?.district?.id) {
      // For district contacts, update the district's last_contacted_at
      await prisma.districtContact.update({
        where: { id: updatedTouchpoint.districtContactId },
        data: { lastContactedAt: new Date() }
      });
    }

    // Format the response to match the expected structure
    const formattedTouchpoint = {
      ...updatedTouchpoint,
      completed_at: updatedTouchpoint.completedAt,
      scheduled_at: updatedTouchpoint.scheduledAt,
      created_at: updatedTouchpoint.createdAt,
      lead_id: updatedTouchpoint.leadId,
      district_contact_id: updatedTouchpoint.districtContactId,
      lead: updatedTouchpoint.lead ? {
        ...updatedTouchpoint.lead,
        first_name: updatedTouchpoint.lead.firstName,
        last_name: updatedTouchpoint.lead.lastName
      } : null,
      district_contact: updatedTouchpoint.districtContact ? {
        ...updatedTouchpoint.districtContact,
        first_name: updatedTouchpoint.districtContact.firstName,
        last_name: updatedTouchpoint.districtContact.lastName,
        district_lead: {
          id: updatedTouchpoint.districtContact.district?.id
        }
      } : null
    };

    return NextResponse.json({
      success: true,
      touchpoint: formattedTouchpoint,
      message: 'Touchpoint updated successfully'
    });

  } catch (error) {
    console.error('Error updating touchpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
