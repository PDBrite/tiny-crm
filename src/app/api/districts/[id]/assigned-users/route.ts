import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

    // Get the district ID from the params
    const { id: districtId } = await context.params;

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId }
    });

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    // Get users assigned to this district
    const assignments = await prisma.userDistrictAssignment.findMany({
      where: {
        districtId: districtId
      },
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
    });

    // Extract user information
    const users = assignments.map(assignment => assignment.user);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching assigned users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 