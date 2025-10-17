import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getInstantlyClient } from '@/lib/instantly-client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instantlyClient = getInstantlyClient()
    const accounts = await instantlyClient.getAccounts()

    return NextResponse.json({
      accounts,
      count: accounts.length,
    })
  } catch (error) {
    console.error('Error fetching Instantly accounts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch accounts from Instantly',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
