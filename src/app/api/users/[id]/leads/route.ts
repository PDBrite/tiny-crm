import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRoleType } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the params
    const { id: userId } = await params;

    // Only admin users can access other users' leads
    if (session.user.role !== UserRoleType.admin && session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        companyAccess: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get companies the user has access to
    const userCompanies = user.companyAccess.map(access => access.company);
    
    // Get leads assigned to this user
    const userLeadAssignments = await prisma.userLeadAssignment.findMany({
      where: {
        userId: userId
      },
      include: {
        lead: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                company: true
              }
            }
          }
        }
      }
    });
    
    // Get district contacts via district assignments
    const userDistrictAssignments = await prisma.userDistrictAssignment.findMany({
      where: {
        userId: userId
      },
      include: {
        district: {
          include: {
            contacts: {
              include: {
                campaign: {
                  select: {
                    id: true,
                    name: true,
                    company: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Extract leads from assignments
    const leads = userLeadAssignments.map(assignment => assignment.lead);
    
    // Extract district contacts from district assignments
    const districtContacts = userDistrictAssignments.flatMap(
      assignment => assignment.district.contacts.map(contact => ({
        ...contact,
        districtName: assignment.district.name
      }))
    );
    
    // For admin users, show all leads if no assignments exist
    if (user.role === UserRoleType.admin && leads.length === 0 && districtContacts.length === 0) {
      // Get regular leads
      const allLeads = await prisma.lead.findMany({
        where: {
          campaign: {
            company: {
              in: userCompanies
            }
          }
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              company: true
            }
          }
        },
        take: 100 // Limit to 100 leads
      });
      
      // Get district contacts
      const allDistrictContacts = await prisma.districtContact.findMany({
        where: {
          campaign: {
            company: {
              in: userCompanies
            }
          }
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              company: true
            }
          },
          district: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: 100 // Limit to 100 district contacts
      });
      
      // Format leads
      const formattedLeads = allLeads.map(lead => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        campaignId: lead.campaignId,
        campaignName: lead.campaign?.name
      }));

      // Format district contacts
      const formattedDistrictContacts = allDistrictContacts.map(contact => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
        districtName: contact.district?.name || 'Unknown District',
        status: contact.status,
        campaignId: contact.campaignId,
        campaignName: contact.campaign?.name
      }));

      return NextResponse.json({
        leads: formattedLeads,
        districtContacts: formattedDistrictContacts,
        count: {
          leads: formattedLeads.length,
          districtContacts: formattedDistrictContacts.length,
          total: formattedLeads.length + formattedDistrictContacts.length
        }
      });
    }

    // Format leads
    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      campaignId: lead.campaignId,
      campaignName: lead.campaign?.name
    }));

    // Format district contacts
    const formattedDistrictContacts = districtContacts.map(contact => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      districtName: contact.districtName || 'Unknown District',
      status: contact.status,
      campaignId: contact.campaignId,
      campaignName: contact.campaign?.name
    }));

    return NextResponse.json({
      leads: formattedLeads,
      districtContacts: formattedDistrictContacts,
      count: {
        leads: formattedLeads.length,
        districtContacts: formattedDistrictContacts.length,
        total: formattedLeads.length + formattedDistrictContacts.length
      }
    });
  } catch (error) {
    console.error('Error fetching user leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can assign leads
    if (session.user.role !== UserRoleType.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the user ID from the params
    const { id: userId } = await params;
    const body = await request.json();
    const { leadIds, districtIds, action } = body;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle lead assignments
    if (leadIds && Array.isArray(leadIds)) {
      if (action === 'assign') {
        // Create assignments for each lead
        const assignments = await Promise.all(
          leadIds.map(async (leadId) => {
            // Check if assignment already exists
            const existingAssignment = await prisma.userLeadAssignment.findUnique({
              where: {
                userId_leadId: {
                  userId,
                  leadId
                }
              }
            });

            if (!existingAssignment) {
              return prisma.userLeadAssignment.create({
                data: {
                  userId,
                  leadId
                }
              });
            }
            return existingAssignment;
          })
        );

        return NextResponse.json({
          message: `${assignments.length} leads assigned to user`,
          assignments
        });
      } else if (action === 'unassign') {
        // Delete assignments for each lead
        const result = await prisma.userLeadAssignment.deleteMany({
          where: {
            userId,
            leadId: {
              in: leadIds
            }
          }
        });

        return NextResponse.json({
          message: `${result.count} leads unassigned from user`,
          count: result.count
        });
      }
    }

    // Handle district assignments
    if (districtIds && Array.isArray(districtIds)) {
      if (action === 'assign') {
        // Create assignments for each district
        const assignments = await Promise.all(
          districtIds.map(async (districtId) => {
            // Check if assignment already exists
            const existingAssignment = await prisma.userDistrictAssignment.findUnique({
              where: {
                userId_districtId: {
                  userId,
                  districtId
                }
              }
            });

            if (!existingAssignment) {
              return prisma.userDistrictAssignment.create({
                data: {
                  userId,
                  districtId
                }
              });
            }
            return existingAssignment;
          })
        );

        return NextResponse.json({
          message: `${assignments.length} districts assigned to user`,
          assignments
        });
      } else if (action === 'unassign') {
        // Delete assignments for each district
        const result = await prisma.userDistrictAssignment.deleteMany({
          where: {
            userId,
            districtId: {
              in: districtIds
            }
          }
        });

        return NextResponse.json({
          message: `${result.count} districts unassigned from user`,
          count: result.count
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide leadIds or districtIds and action.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error managing user assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 