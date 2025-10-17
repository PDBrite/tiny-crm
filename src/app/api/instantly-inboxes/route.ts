import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { instantlyClient } from '@/lib/instantly-client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inboxes = await instantlyClient.getInboxes()

    return NextResponse.json({
      inboxes,
      count: inboxes.length,
    })
  } catch (error) {
    console.error('Error fetching Instantly inboxes:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch inboxes from Instantly',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
