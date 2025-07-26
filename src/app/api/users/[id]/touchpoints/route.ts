import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRoleType } from '@prisma/client';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the params
    const { id: userId } = await context.params;

    // Only admin users can access other users' touchpoints
    if (session.user.role !== UserRoleType.admin && session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get touchpoints created by this user
    // For now, we'll use a simple approach - in a real app, you might track
    // which user created each touchpoint
    const touchpoints = await prisma.touchpoint.findMany({
      where: {
        // This is a simplified approach - in a real app, you'd have a created_by field
        // OR: [
        //   { created_by: userId },
        // ]
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        districtContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to 50 most recent touchpoints
    });

    // Transform touchpoints to match the expected format
    const formattedTouchpoints = touchpoints.map(tp => ({
      id: tp.id,
      type: tp.type,
      subject: tp.subject,
      content: tp.content,
      scheduled_at: tp.scheduledAt,
      completed_at: tp.completedAt,
      outcome: tp.outcome,
      created_at: tp.createdAt,
      lead: tp.lead ? {
        id: tp.lead.id,
        first_name: tp.lead.firstName,
        last_name: tp.lead.lastName,
        email: tp.lead.email
      } : undefined,
      district_contact: tp.districtContact ? {
        id: tp.districtContact.id,
        first_name: tp.districtContact.firstName,
        last_name: tp.districtContact.lastName,
        email: tp.districtContact.email
      } : undefined
    }));

    return NextResponse.json({
      touchpoints: formattedTouchpoints,
      count: formattedTouchpoints.length
    });
  } catch (error) {
    console.error('Error fetching user touchpoints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 