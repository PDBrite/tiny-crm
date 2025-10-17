import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const campaigns = await prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        instantlyCampaignId: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    const campaignsWithSync = campaigns.map(campaign => ({
      ...campaign,
      hasInstantlyId: !!campaign.instantlyCampaignId,
      instantlySynced: campaign.instantlyCampaignId ? 'Yes ✅' : 'No ❌',
    }))

    return NextResponse.json({
      total: campaigns.length,
      campaigns: campaignsWithSync,
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
