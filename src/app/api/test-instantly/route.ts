import { NextResponse } from 'next/server'
import { getInstantlyClient, InstantlyError } from '@/lib/instantly-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.INSTANTLY_API_KEY === 'your-instantly-api-key-here') {
      return NextResponse.json(
        { error: 'Instantly API key is not configured' },
        { status: 400 }
      )
    }

    console.log('Testing Instantly campaign creation...')
    const instantlyClient = getInstantlyClient()

    const testCampaignName = `Test Campaign ${new Date().toISOString()}`

    const campaignPayload = {
      name: testCampaignName,
      campaign_schedule: {
        schedules: [
          {
            name: 'Default Schedule',
            timing: {
              from: '08:00',
              to: '17:00',
            },
            days: {
              "0": false,
              "1": true,
              "2": true,
              "3": true,
              "4": true,
              "5": true,
              "6": false,
            },
            timezone: 'Etc/GMT+12',
          },
        ],
      },
    }

    console.log('Campaign payload:', JSON.stringify(campaignPayload, null, 2))

    const instantlyCampaign = await instantlyClient.createCampaign(campaignPayload)

    console.log('Test campaign created successfully in Instantly:', instantlyCampaign.id)

    const statusMap: Record<number, string> = {
      0: 'Draft',
      1: 'Active',
      2: 'Paused',
      3: 'Completed',
      4: 'Running Subsequences',
      [-99]: 'Account Suspended',
      [-1]: 'Accounts Unhealthy',
      [-2]: 'Bounce Protect',
    }

    return NextResponse.json({
      success: true,
      message: 'Test campaign created successfully in Instantly',
      campaign: {
        id: instantlyCampaign.id,
        name: instantlyCampaign.name,
        status: instantlyCampaign.status,
        statusText: statusMap[instantlyCampaign.status] || 'Unknown',
        created_at: instantlyCampaign.timestamp_created,
      },
    })
  } catch (error) {
    if (error instanceof InstantlyError) {
      console.error('Failed to create test campaign in Instantly:', error.message)
      return NextResponse.json(
        {
          error: 'Failed to create test campaign in Instantly',
          details: error.message,
          status: error.status,
          response: error.response,
        },
        { status: error.status || 500 }
      )
    } else {
      console.error('Failed to create test campaign:', error)
      return NextResponse.json(
        { error: 'Failed to create test campaign', details: String(error) },
        { status: 500 }
      )
    }
  }
}
