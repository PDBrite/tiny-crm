import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { TouchpointType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []

    const { lead_id, district_contact_id, type, subject, content, completed_at, outcome } = await request.json()
    
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
          district: {
            select: {
              campaign: {
                select: { company: true }
              }
            }
          }
        }
      });

      if (!districtContact || !districtContact.district || !districtContact.district.campaign) {
        return NextResponse.json({ error: 'District contact not found' }, { status: 404 })
      }

      const districtCompany = districtContact.district.campaign.company.toLowerCase()
      if (!allowedCompanies.includes(districtCompany)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (userRole === 'member' && districtCompany !== 'avalern') {
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
        scheduledAt: new Date() // Default to current time if not provided
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
        // For district contacts, update the district's lastContactedAt
        const districtContact = await prisma.districtContact.findUnique({
          where: { id: district_contact_id },
          select: { districtId: true }
        });
        
        if (districtContact) {
          await prisma.district.update({
            where: { id: districtContact.districtId },
            data: { lastContactedAt: new Date(completed_at) }
          });
        }
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
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedCompanies = session.user.allowedCompanies || []
    
    // Get query parameters
    const url = new URL(request.url)
    const leadId = url.searchParams.get('lead_id')
    const districtContactId = url.searchParams.get('district_contact_id')
    const campaignId = url.searchParams.get('campaign_id')
    const includeDetails = url.searchParams.get('include_details') === 'true'
    
    console.log('Touchpoints API: Query params:', { leadId, districtContactId, campaignId, includeDetails })

    // Build query based on parameters
    let touchpointsData: any[] = []
    
    // Case 1: Filter by campaign_id
    if (campaignId) {
      console.log(`Fetching touchpoints for campaign: ${campaignId}`)
      
      // First check if this is an Avalern campaign
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, company: true }
      });
      
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      
      const campaignCompany = campaign.company.toLowerCase()
      if (!allowedCompanies.includes(campaignCompany)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (userRole === 'member' && campaignCompany !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const isAvalern = campaign.company === 'Avalern'
      console.log(`Campaign belongs to ${campaign.company}`)
      
      if (isAvalern) {
        // For Avalern, get district contacts and their touchpoints
        const districtContacts = await prisma.districtContact.findMany({
          where: {
            campaignId: campaignId
          },
          include: {
            district: true,
            touchpoints: {
              orderBy: {
                scheduledAt: 'asc'
              }
            }
          }
        });
        
        console.log(`Found ${districtContacts.length} district contacts for campaign ${campaignId}`);
        
        // Transform district touchpoints to match the expected format
        const districtTouchpoints = districtContacts.flatMap(contact => {
          return contact.touchpoints.map(tp => ({
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
              id: contact.id,
              first_name: contact.firstName,
              last_name: contact.lastName,
              email: contact.email,
              district_lead_id: contact.districtId
            } : undefined
          }));
        });
        
        console.log(`Found ${districtTouchpoints.length} district touchpoints`);
        touchpointsData = [...touchpointsData, ...districtTouchpoints];
      }
      
      // Get regular leads and their touchpoints
      const leads = await prisma.lead.findMany({
        where: {
          campaignId: campaignId
        },
        include: {
          touchpoints: {
            orderBy: {
              scheduledAt: 'asc'
            }
          }
        }
      });
      
      console.log(`Found ${leads.length} leads for campaign ${campaignId}`);
      
      // Transform lead touchpoints to match the expected format
      const leadTouchpoints = leads.flatMap(lead => {
        return lead.touchpoints.map(tp => ({
          id: tp.id,
          type: tp.type,
          subject: tp.subject,
          content: tp.content,
          scheduled_at: tp.scheduledAt,
          completed_at: tp.completedAt,
          outcome: tp.outcome,
          created_at: tp.createdAt,
          lead_id: tp.leadId,
          lead: includeDetails ? {
            id: lead.id,
            first_name: lead.firstName,
            last_name: lead.lastName,
            email: lead.email,
            campaign_id: lead.campaignId
          } : undefined
        }));
      });
      
      console.log(`Found ${leadTouchpoints.length} lead touchpoints`);
      touchpointsData = [...touchpointsData, ...leadTouchpoints];
    }
    // Case 2: Filter by lead_id
    else if (leadId) {
      // Security check: Verify the user has permission to view this lead's touchpoints
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          campaign: {
            select: { company: true }
          }
        }
      });

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const leadCompany = lead.campaign.company.toLowerCase()
      if (!allowedCompanies.includes(leadCompany)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (userRole === 'member' && leadCompany !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Fetch touchpoints for this lead
      const touchpoints = await prisma.touchpoint.findMany({
        where: { leadId: leadId },
        orderBy: { scheduledAt: 'asc' },
        include: includeDetails ? {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        } : undefined
      });
      
      // Transform to match the expected format
      touchpointsData = touchpoints.map(tp => ({
        id: tp.id,
        type: tp.type,
        subject: tp.subject,
        content: tp.content,
        scheduled_at: tp.scheduledAt,
        completed_at: tp.completedAt,
        outcome: tp.outcome,
        created_at: tp.createdAt,
        lead_id: tp.leadId,
        lead: includeDetails && tp.lead ? {
          id: tp.lead.id,
          first_name: tp.lead.firstName,
          last_name: tp.lead.lastName,
          email: tp.lead.email
        } : undefined
      }));
    }
    // Case 3: Filter by district_contact_id
    else if (districtContactId) {
      // Security check: Verify the user has permission to view this contact's touchpoints
      const districtContact = await prisma.districtContact.findUnique({
        where: { id: districtContactId },
        select: {
          district: {
            select: {
              campaign: {
                select: { company: true }
              }
            }
          }
        }
      });

      if (!districtContact || !districtContact.district || !districtContact.district.campaign) {
        return NextResponse.json({ error: 'District contact not found' }, { status: 404 })
      }

      const districtCompany = districtContact.district.campaign.company.toLowerCase()
      if (!allowedCompanies.includes(districtCompany)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (userRole === 'member' && districtCompany !== 'avalern') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Fetch touchpoints for this district contact
      const touchpoints = await prisma.touchpoint.findMany({
        where: { districtContactId: districtContactId },
        orderBy: { scheduledAt: 'asc' },
        include: includeDetails ? {
          districtContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        } : undefined
      });
      
      // Transform to match the expected format
      touchpointsData = touchpoints.map(tp => ({
        id: tp.id,
        type: tp.type,
        subject: tp.subject,
        content: tp.content,
        scheduled_at: tp.scheduledAt,
        completed_at: tp.completedAt,
        outcome: tp.outcome,
        created_at: tp.createdAt,
        district_contact_id: tp.districtContactId,
        district_contact: includeDetails && tp.districtContact ? {
          id: tp.districtContact.id,
          first_name: tp.districtContact.firstName,
          last_name: tp.districtContact.lastName,
          email: tp.districtContact.email
        } : undefined
      }));
    }
    
    console.log(`Found ${touchpointsData.length} touchpoints`);
    return NextResponse.json({
      touchpoints: touchpointsData,
      count: touchpointsData.length
    });
    
  } catch (error) {
    console.error('Error in touchpoints API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      await prisma.district.update({
        where: { id: updatedTouchpoint.districtContact.district.id },
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
