import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getInstantlyClient, InstantlyError } from '@/lib/instantly-client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name,
      company,
      description,
      startDate,
      endDate,
      outreachSequenceId,
      instantlyCampaignId,
      leadIds
    } = await request.json()

    if (!name || !company || !leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        company,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        outreachSequenceId,
        instantlyCampaignId: instantlyCampaignId || null,
        status: 'active',
        createdById: session.user.id,
      },
      include: {
        outreachSequence: {
          include: {
            steps: true
          }
        }
      }
    })

    // Assign selected leads to the campaign and update status to actively_contacting
    await prisma.lead.updateMany({
      where: {
        id: {
          in: leadIds,
        },
      },
      data: {
        campaignId: campaign.id,
        status: 'actively_contacting',
      },
    })

    // Verify leads were updated correctly
    const verifiedLeads = await prisma.lead.findMany({
      where: {
        id: {
          in: leadIds,
        },
      },
      select: {
        id: true,
        campaignId: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        phone: true,
        websiteUrl: true,
      },
    })

    const correctlyUpdated = verifiedLeads.filter(l => l.campaignId === campaign.id).length

    let instantlySyncError: string | null = null;
    let leadsAddedToInstantly = 0;

    if (campaign.instantlyCampaignId && process.env.INSTANTLY_API_KEY !== 'your-instantly-api-key-here') {
      try {
        console.log(`Adding ${verifiedLeads.length} leads to Instantly campaign ${campaign.instantlyCampaignId}`);
        const instantlyClient = getInstantlyClient();

        const instantlyLeads = verifiedLeads.map(lead => ({
          email: lead.email,
          first_name: lead.firstName || undefined,
          last_name: lead.lastName || undefined,
          company: lead.company || undefined,
          phone: lead.phone || undefined,
          website: lead.websiteUrl || undefined,
        }));

        const result = await instantlyClient.addLeadsToCampaign(
          campaign.instantlyCampaignId,
          instantlyLeads
        );

        leadsAddedToInstantly = result.added;
        console.log(`Successfully added ${result.added} leads to Instantly campaign`);

        if (result.failed > 0) {
          console.warn(`Failed to add ${result.failed} leads to Instantly campaign`);
        }
      } catch (error) {
        if (error instanceof InstantlyError) {
          console.error('Failed to sync leads with Instantly:', error.message);
          instantlySyncError = error.message;
        } else {
          console.error('Failed to sync leads with Instantly:', error);
          instantlySyncError = 'Unknown error syncing leads with Instantly';
        }
      }
    }

    const response: any = {
      campaign,
      leadsUpdated: correctlyUpdated,
      totalLeads: leadIds.length,
      leadsAddedToInstantly,
    };

    if (instantlySyncError) {
      response.warning = `Campaign created but failed to sync leads with Instantly: ${instantlySyncError}`;
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
} 