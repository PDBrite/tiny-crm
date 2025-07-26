import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRoleType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const forTouchpoints = url.searchParams.get('for_touchpoints') === 'true';
    
    // If this is for touchpoint filtering, we handle it differently
    if (forTouchpoints) {
      // For member users, only return themselves
      if (session.user.role === UserRoleType.member) {
        const currentUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        });
        
        if (!currentUser) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          users: [currentUser]
        });
      }
      
      // For admin users, return all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        },
        orderBy: {
          email: 'asc'
        }
      });
      
      return NextResponse.json({ users });
    }

    // Regular user listing - only admins can see all users
    if (session.user.role !== UserRoleType.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        companyAccess: {
          select: {
            company: true
          }
        },
        _count: {
          select: {
            leadAssignments: true,
            districtAssignments: true
          }
        }
      },
      orderBy: {
        email: 'asc'
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      created_at: user.createdAt,
      companies: user.companyAccess.map(access => access.company),
      assigned_leads_count: user._count.leadAssignments,
      assigned_districts_count: user._count.districtAssignments
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { email, password, firstName, lastName, role, companies } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user with a transaction to ensure company access is created
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash: password, // Note: In a real app, you would hash this password
          firstName,
          lastName,
          role: role || 'user',
        }
      });

      // Create company access if provided
      if (companies && Array.isArray(companies) && companies.length > 0) {
        await tx.userCompanyAccess.createMany({
          data: companies.map(company => ({
            userId: newUser.id,
            company: company
          }))
        });
      }

      return newUser;
    });

    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 