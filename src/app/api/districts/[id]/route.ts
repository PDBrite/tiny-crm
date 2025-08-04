import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

    // Get the district ID from the params
    const { id: districtId } = await params;

    // Get district with contacts
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      include: {
        contacts: true,
        userAssignments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    // Check if the district is assigned to the current user
    const isAssignedToCurrentUser = district.userAssignments.some(
      assignment => assignment.userId === session.user?.id
    );

    // Format the response
    const formattedDistrict = {
      id: district.id,
      district_name: district.name,
      county: district.county,
      state: district.state,
      district_type: district.type,
      size: district.size,
      budget: district.budget,
      website: district.website,
      notes: district.notes,
      contacts_count: district.contacts.length,
      valid_contacts_count: district.contacts.filter(c => c.email && c.email.trim() !== '').length,
      assigned_to_current_user: isAssignedToCurrentUser,
      assigned_users_count: district.userAssignments.length,
      assigned_users: district.userAssignments.map(assignment => ({
        id: assignment.user.id,
        email: assignment.user.email,
        firstName: assignment.user.firstName,
        lastName: assignment.user.lastName,
        role: assignment.user.role
      }))
    };

    return NextResponse.json(formattedDistrict);
  } catch (error) {
    console.error('Error fetching district:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the district ID from the params
    const { id: districtId } = await params;
    const { status, notes } = await request.json();

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId }
    });

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    // Update district notes
    const updatedDistrict = await prisma.district.update({
      where: { id: districtId },
      data: {
        notes,
        updatedAt: new Date()
      }
    });

    // If status is provided, update all district contacts with that status
    if (status) {
      // Validate status
      const validStatuses = ['not_contacted', 'actively_contacting', 'engaged', 'won', 'not_interested'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      // Update all contacts in this district to the new status
      await prisma.districtContact.updateMany({
        where: { districtId },
        data: { 
          status: status as any, // Type assertion since we validated above
          lastContactedAt: status === 'engaged' ? new Date() : undefined
        }
      });
    }

    return NextResponse.json({
      ...updatedDistrict,
      status_updated: !!status,
      message: status ? `District contacts updated to status: ${status}` : 'District updated successfully'
    });
  } catch (error) {
    console.error('Error updating district:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 