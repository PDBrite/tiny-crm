import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getInstantlyClient, InstantlyError } from '@/lib/instantly-client'
import { TouchpointOutcome } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        company: true,
        instantlyCampaignId: true,
        districtContacts: {
          select: {
            id: true,
            email: true,
          },
        },
        leads: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (!campaign.instantlyCampaignId) {
      return NextResponse.json(
        { error: 'Campaign has no Instantly campaign ID' },
        { status: 400 }
      )
    }

    if (process.env.INSTANTLY_API_KEY === 'your-instantly-api-key-here') {
      return NextResponse.json(
        { error: 'Instantly API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Syncing emails from Instantly campaign ${campaign.instantlyCampaignId}`);
    const instantlyClient = getInstantlyClient();

    const emails = await instantlyClient.getEmails({
      campaign_id: campaign.instantlyCampaignId,
    });

    console.log(`Found ${emails.length} emails from Instantly campaign`);

    const emailToContactMap = new Map<string, { id: string; type: 'lead' | 'district_contact' }>();

    campaign.districtContacts.forEach(contact => {
      if (contact.email) {
        emailToContactMap.set(contact.email.toLowerCase(), {
          id: contact.id,
          type: 'district_contact',
        });
      }
    });

    campaign.leads.forEach(lead => {
      if (lead.email) {
        emailToContactMap.set(lead.email.toLowerCase(), {
          id: lead.id,
          type: 'lead',
        });
      }
    });

    let touchpointsCreated = 0;
    let touchpointsUpdated = 0;
    let touchpointsSkipped = 0;

    for (const email of emails) {
      const contactInfo = emailToContactMap.get(email.email.toLowerCase());

      if (!contactInfo) {
        touchpointsSkipped++;
        continue;
      }

      const leadId = contactInfo.type === 'lead' ? contactInfo.id : null;
      const districtContactId = contactInfo.type === 'district_contact' ? contactInfo.id : null;

      const existingTouchpoint = await prisma.touchpoint.findFirst({
        where: {
          leadId: leadId || undefined,
          districtContactId: districtContactId || undefined,
          type: 'email',
          subject: email.subject || undefined,
          scheduledAt: email.sent_at ? new Date(email.sent_at) : undefined,
        },
      });

      const outcome: TouchpointOutcome | null =
        email.status === 'replied' ? 'replied' :
        email.status === 'bounced' ? 'bounced' :
        email.status === 'opened' ? 'ignored' :
        null;

      if (existingTouchpoint) {
        await prisma.touchpoint.update({
          where: { id: existingTouchpoint.id },
          data: {
            completedAt: email.sent_at ? new Date(email.sent_at) : undefined,
            outcome,
          },
        });
        touchpointsUpdated++;
      } else {
        await prisma.touchpoint.create({
          data: {
            leadId,
            districtContactId,
            type: 'email',
            subject: email.subject || '',
            content: email.body || '',
            scheduledAt: email.sent_at ? new Date(email.sent_at) : new Date(),
            completedAt: email.sent_at ? new Date(email.sent_at) : undefined,
            outcome,
            createdById: session.user.id,
          },
        });
        touchpointsCreated++;
      }

      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { lastContactedAt: email.sent_at ? new Date(email.sent_at) : undefined },
        });
      } else if (districtContactId) {
        await prisma.districtContact.update({
          where: { id: districtContactId },
          data: { lastContactedAt: email.sent_at ? new Date(email.sent_at) : undefined },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${emails.length} emails from Instantly`,
      touchpointsCreated,
      touchpointsUpdated,
      touchpointsSkipped,
    })

  } catch (error) {
    if (error instanceof InstantlyError) {
      console.error('Instantly API error:', error.message);
      return NextResponse.json(
        { error: `Instantly API error: ${error.message}` },
        { status: 500 }
      )
    }

    console.error('Sync instantly error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 