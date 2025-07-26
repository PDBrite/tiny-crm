import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const unassigned = searchParams.get('unassigned') === 'true'
    
    const leads = await prisma.lead.findMany({
      where: unassigned ? {
        campaignId: null, // Only leads not assigned to campaigns
      } : {},
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(leads)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
} 