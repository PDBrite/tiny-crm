import { PrismaClient, CompanyType, CampaignStatusType, LeadStatusType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create users
  console.log('Creating users...');
  const adminPasswordHash = await hash('adminpassword', 10);
  const memberPasswordHash = await hash('memberpassword', 10);

  // Create 3 admin users
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      companyAccess: {
        create: [
          { company: 'Avalern' },
          { company: 'CraftyCode' }
        ]
      }
    }
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'sarah.admin@example.com' },
    update: {},
    create: {
      email: 'sarah.admin@example.com',
      passwordHash: adminPasswordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'admin',
      companyAccess: {
        create: [
          { company: 'Avalern' },
          { company: 'CraftyCode' }
        ]
      }
    }
  });

  const admin3 = await prisma.user.upsert({
    where: { email: 'mike.admin@example.com' },
    update: {},
    create: {
      email: 'mike.admin@example.com',
      passwordHash: adminPasswordHash,
      firstName: 'Mike',
      lastName: 'Chen',
      role: 'admin',
      companyAccess: {
        create: [
          { company: 'Avalern' },
          { company: 'CraftyCode' }
        ]
      }
    }
  });

  // Create 2 member users
  const member1 = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      passwordHash: memberPasswordHash,
      firstName: 'Member',
      lastName: 'User',
      role: 'member',
      companyAccess: {
        create: [
          { company: 'Avalern' }
        ]
      }
    }
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'lisa.member@example.com' },
    update: {},
    create: {
      email: 'lisa.member@example.com',
      passwordHash: memberPasswordHash,
      firstName: 'Lisa',
      lastName: 'Rodriguez',
      role: 'member',
      companyAccess: {
        create: [
          { company: 'Avalern' }
        ]
      }
    }
  });

  console.log('Created users:', { 
    admin1: admin1.email, 
    admin2: admin2.email, 
    admin3: admin3.email,
    member1: member1.email, 
    member2: member2.email 
  });

  // Create outreach sequences
  console.log('Creating outreach sequences...');
  const avalernSequence = await prisma.outreachSequence.upsert({
    where: { id: 'seq-avalern-1' },
    update: {},
    create: {
      id: 'seq-avalern-1',
      name: 'District Engagement Sequence',
      company: 'Avalern',
      description: 'Standard outreach sequence for school districts',
      steps: {
        create: [
          {
            stepOrder: 1,
            type: 'email',
            name: 'Introduction Email',
            dayOffset: 0,
            contentLink: 'https://example.com/templates/intro-email'
          },
          {
            stepOrder: 2,
            type: 'email',
            name: 'Follow-up Email',
            dayOffset: 3,
            contentLink: 'https://example.com/templates/followup-email'
          },
          {
            stepOrder: 3,
            type: 'call',
            name: 'Initial Call',
            dayOffset: 5,
            contentLink: 'https://example.com/templates/call-script'
          },
          {
            stepOrder: 4,
            type: 'email',
            name: 'Case Study Email',
            dayOffset: 10,
            contentLink: 'https://example.com/templates/case-study'
          }
        ]
      }
    }
  });

  const craftyCodeSequence = await prisma.outreachSequence.upsert({
    where: { id: 'seq-craftycode-1' },
    update: {},
    create: {
      id: 'seq-craftycode-1',
      name: 'Real Estate Lead Sequence',
      company: 'CraftyCode',
      description: 'Standard outreach sequence for real estate leads',
      steps: {
        create: [
          {
            stepOrder: 1,
            type: 'email',
            name: 'Introduction Email',
            dayOffset: 0,
            contentLink: 'https://example.com/templates/realestate-intro'
          },
          {
            stepOrder: 2,
            type: 'linkedin_message',
            name: 'LinkedIn Connection',
            dayOffset: 2,
            contentLink: 'https://example.com/templates/linkedin-script'
          },
          {
            stepOrder: 3,
            type: 'email',
            name: 'Value Proposition',
            dayOffset: 5,
            contentLink: 'https://example.com/templates/value-prop'
          },
          {
            stepOrder: 4,
            type: 'call',
            name: 'Sales Call',
            dayOffset: 8,
            contentLink: 'https://example.com/templates/sales-call'
          }
        ]
      }
    }
  });

  // Create campaigns
  console.log('Creating campaigns...');
  const avalernCampaign = await prisma.campaign.upsert({
    where: { id: 'camp-avalern-1' },
    update: {},
    create: {
      id: 'camp-avalern-1',
      name: 'California School Districts Q3 2025',
      company: 'Avalern',
      description: 'Outreach to California school districts for Q3 2025',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-09-30'),
      status: 'active',
      outreachSequenceId: avalernSequence.id
    }
  });

  const craftyCodeCampaign = await prisma.campaign.upsert({
    where: { id: 'camp-craftycode-1' },
    update: {},
    create: {
      id: 'camp-craftycode-1',
      name: 'San Fernando Valley Real Estate Q3 2025',
      company: 'CraftyCode',
      description: 'Outreach to San Fernando Valley real estate prospects',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-09-30'),
      status: 'active',
      outreachSequenceId: craftyCodeSequence.id
    }
  });

  // Create districts
  console.log('Creating districts...');
  const districts = [
    {
      id: 'district-1',
      name: 'Los Angeles Unified School District',
      county: 'Los Angeles',
      state: 'California',
      type: 'Unified',
      size: 730000,
      budget: 7800000000,
      website: 'https://www.lausd.net',
      notes: 'Largest school district in California'
    },
    {
      id: 'district-2',
      name: 'San Diego Unified School District',
      county: 'San Diego',
      state: 'California',
      type: 'Unified',
      size: 121000,
      budget: 1590000000,
      website: 'https://www.sandiegounified.org',
      notes: 'Second largest district in California'
    },
    {
      id: 'district-3',
      name: 'Fresno Unified School District',
      county: 'Fresno',
      state: 'California',
      type: 'Unified',
      size: 73000,
      budget: 1100000000,
      website: 'https://www.fresnounified.org',
      notes: 'Third largest district in California'
    },
    {
      id: 'district-4',
      name: 'Long Beach Unified School District',
      county: 'Los Angeles',
      state: 'California',
      type: 'Unified',
      size: 70000,
      budget: 1000000000,
      website: 'https://www.lbschools.net',
      notes: 'Fourth largest district in California'
    },
    {
      id: 'district-5',
      name: 'Elk Grove Unified School District',
      county: 'Sacramento',
      state: 'California',
      type: 'Unified',
      size: 63000,
      budget: 900000000,
      website: 'https://www.egusd.net',
      notes: 'Fifth largest district in California'
    }
  ];

  for (const district of districts) {
    await prisma.district.upsert({
      where: { id: district.id },
      update: {},
      create: district
    });
  }

  // Create district contacts
  console.log('Creating district contacts...');
  const districtContacts = [
    {
      id: 'contact-1',
      districtId: 'district-1',
      firstName: 'Alberto',
      lastName: 'Carvalho',
      title: 'Superintendent',
      email: 'alberto.carvalho@lausd.net',
      phone: '213-555-1000',
      linkedinUrl: 'https://www.linkedin.com/in/alberto-carvalho',
      status: 'not_contacted' as const,
      campaignId: avalernCampaign.id
    },
    {
      id: 'contact-2',
      districtId: 'district-1',
      firstName: 'Maria',
      lastName: 'Rodriguez',
      title: 'Chief Technology Officer',
      email: 'maria.rodriguez@lausd.net',
      phone: '213-555-1001',
      linkedinUrl: 'https://www.linkedin.com/in/maria-rodriguez',
      status: 'actively_contacting' as const,
      campaignId: avalernCampaign.id
    },
    {
      id: 'contact-3',
      districtId: 'district-2',
      firstName: 'Lamont',
      lastName: 'Jackson',
      title: 'Superintendent',
      email: 'ljackson@sandi.net',
      phone: '619-555-2000',
      linkedinUrl: 'https://www.linkedin.com/in/lamont-jackson',
      status: 'engaged' as const,
      campaignId: avalernCampaign.id
    },
    {
      id: 'contact-4',
      districtId: 'district-3',
      firstName: 'Robert',
      lastName: 'Nelson',
      title: 'Superintendent',
      email: 'robert.nelson@fresnounified.org',
      phone: '559-555-3000',
      linkedinUrl: 'https://www.linkedin.com/in/robert-nelson',
      status: 'not_contacted' as const,
      campaignId: avalernCampaign.id
    },
    {
      id: 'contact-5',
      districtId: 'district-4',
      firstName: 'Jill',
      lastName: 'Baker',
      title: 'Superintendent',
      email: 'jbaker@lbschools.net',
      phone: '562-555-4000',
      linkedinUrl: 'https://www.linkedin.com/in/jill-baker',
      status: 'not_contacted' as const,
      campaignId: avalernCampaign.id
    }
  ];

  for (const contact of districtContacts) {
    await prisma.districtContact.upsert({
      where: { id: contact.id },
      update: {},
      create: contact
    });
  }

  // Create leads for CraftyCode
  console.log('Creating leads...');
  const leads = [
    {
      id: 'lead-1',
      firstName: 'James',
      lastName: 'Wilson',
      email: 'james.wilson@example.com',
      phone: '818-555-1111',
      city: 'Sherman Oaks',
      state: 'California',
      company: 'Wilson Real Estate',
      linkedinUrl: 'https://www.linkedin.com/in/james-wilson',
      websiteUrl: 'https://www.wilsonrealestate.com',
      status: 'not_contacted' as const,
      source: 'LinkedIn',
      campaignId: craftyCodeCampaign.id
    },
    {
      id: 'lead-2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '818-555-2222',
      city: 'Studio City',
      state: 'California',
      company: 'Johnson Properties',
      linkedinUrl: 'https://www.linkedin.com/in/sarah-johnson',
      websiteUrl: 'https://www.johnsonproperties.com',
      status: 'actively_contacting' as const,
      source: 'Referral',
      campaignId: craftyCodeCampaign.id
    },
    {
      id: 'lead-3',
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@example.com',
      phone: '818-555-3333',
      city: 'Encino',
      state: 'California',
      company: 'Brown Realty',
      linkedinUrl: 'https://www.linkedin.com/in/michael-brown',
      websiteUrl: 'https://www.brownrealty.com',
      status: 'engaged' as const,
      source: 'Website',
      campaignId: craftyCodeCampaign.id
    },
    {
      id: 'lead-4',
      firstName: 'Jennifer',
      lastName: 'Davis',
      email: 'jennifer.davis@example.com',
      phone: '818-555-4444',
      city: 'Tarzana',
      state: 'California',
      company: 'Davis & Associates',
      linkedinUrl: 'https://www.linkedin.com/in/jennifer-davis',
      websiteUrl: 'https://www.davisassociates.com',
      status: 'won' as const,
      source: 'Conference',
      campaignId: craftyCodeCampaign.id
    },
    {
      id: 'lead-5',
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert.martinez@example.com',
      phone: '818-555-5555',
      city: 'Woodland Hills',
      state: 'California',
      company: 'Martinez Realty Group',
      linkedinUrl: 'https://www.linkedin.com/in/robert-martinez',
      websiteUrl: 'https://www.martinezrealtygroup.com',
      status: 'not_interested' as const,
      source: 'Cold Call',
      campaignId: craftyCodeCampaign.id
    }
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: lead
    });
  }

  // Create touchpoints
  console.log('Creating touchpoints...');
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Touchpoints for district contacts
  const districtTouchpoints = [
    {
      id: 'tp-district-1',
      districtContactId: 'contact-2',
      type: 'email' as const,
      subject: 'Introduction to Avalern Educational Solutions',
      content: 'Dear Maria, I hope this email finds you well. I wanted to introduce you to Avalern...',
      scheduledAt: threeDaysAgo,
      completedAt: threeDaysAgo,
      outcome: 'Delivered',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-district-2',
      districtContactId: 'contact-2',
      type: 'email' as const,
      subject: 'Follow-up: Avalern Educational Solutions',
      content: 'Dear Maria, I wanted to follow up on my previous email about Avalern...',
      scheduledAt: yesterday,
      completedAt: yesterday,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-district-3',
      districtContactId: 'contact-2',
      type: 'call' as const,
      subject: 'Initial Discussion',
      content: 'Call to discuss how Avalern can help LAUSD with their educational technology needs.',
      scheduledAt: tomorrow,
      completedAt: null,
      outcome: null,
      outcomeEnum: null
    },
    {
      id: 'tp-district-4',
      districtContactId: 'contact-3',
      type: 'email' as const,
      subject: 'Introduction to Avalern Educational Solutions',
      content: 'Dear Lamont, I hope this email finds you well. I wanted to introduce you to Avalern...',
      scheduledAt: twoDaysAgo,
      completedAt: twoDaysAgo,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-district-5',
      districtContactId: 'contact-3',
      type: 'call' as const,
      subject: 'Discussion about Avalern Solutions',
      content: 'Call to discuss specific needs and how Avalern can help.',
      scheduledAt: yesterday,
      completedAt: yesterday,
      outcome: 'Positive',
      outcomeEnum: 'booked' as const
    }
  ];

  for (const touchpoint of districtTouchpoints) {
    await prisma.touchpoint.upsert({
      where: { id: touchpoint.id },
      update: {},
      create: touchpoint
    });
  }

  // Touchpoints for leads
  const leadTouchpoints = [
    {
      id: 'tp-lead-1',
      leadId: 'lead-2',
      type: 'email' as const,
      subject: 'Introduction to CraftyCode Web Solutions',
      content: 'Dear Sarah, I hope this email finds you well. I wanted to introduce you to CraftyCode...',
      scheduledAt: threeDaysAgo,
      completedAt: threeDaysAgo,
      outcome: 'Delivered',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-lead-2',
      leadId: 'lead-2',
      type: 'email' as const,
      subject: 'Follow-up: CraftyCode Web Solutions',
      content: 'Dear Sarah, I wanted to follow up on my previous email about CraftyCode...',
      scheduledAt: yesterday,
      completedAt: yesterday,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-lead-3',
      leadId: 'lead-2',
      type: 'call' as const,
      subject: 'Initial Discussion',
      content: 'Call to discuss how CraftyCode can help with their web presence.',
      scheduledAt: tomorrow,
      completedAt: null,
      outcome: null,
      outcomeEnum: null
    },
    {
      id: 'tp-lead-4',
      leadId: 'lead-3',
      type: 'email' as const,
      subject: 'Introduction to CraftyCode Web Solutions',
      content: 'Dear Michael, I hope this email finds you well. I wanted to introduce you to CraftyCode...',
      scheduledAt: twoDaysAgo,
      completedAt: twoDaysAgo,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-lead-5',
      leadId: 'lead-3',
      type: 'call' as const,
      subject: 'Discussion about CraftyCode Solutions',
      content: 'Call to discuss specific needs and how CraftyCode can help.',
      scheduledAt: yesterday,
      completedAt: yesterday,
      outcome: 'Positive',
      outcomeEnum: 'booked' as const
    },
    {
      id: 'tp-lead-6',
      leadId: 'lead-4',
      type: 'email' as const,
      subject: 'Introduction to CraftyCode Web Solutions',
      content: 'Dear Jennifer, I hope this email finds you well. I wanted to introduce you to CraftyCode...',
      scheduledAt: threeDaysAgo,
      completedAt: threeDaysAgo,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-lead-7',
      leadId: 'lead-4',
      type: 'call' as const,
      subject: 'Initial Discussion',
      content: 'Call to discuss how CraftyCode can help with their web presence.',
      scheduledAt: twoDaysAgo,
      completedAt: twoDaysAgo,
      outcome: 'Positive',
      outcomeEnum: 'booked' as const
    },
    {
      id: 'tp-lead-8',
      leadId: 'lead-4',
      type: 'email' as const,
      subject: 'Proposal: CraftyCode Web Solutions',
      content: 'Dear Jennifer, Please find attached our proposal for your web development needs...',
      scheduledAt: yesterday,
      completedAt: yesterday,
      outcome: 'Replied',
      outcomeEnum: 'replied' as const
    },
    {
      id: 'tp-lead-9',
      leadId: 'lead-4',
      type: 'call' as const,
      subject: 'Contract Discussion',
      content: 'Call to finalize contract details.',
      scheduledAt: now,
      completedAt: now,
      outcome: 'Won',
      outcomeEnum: 'booked' as const
    }
  ];

  for (const touchpoint of leadTouchpoints) {
    await prisma.touchpoint.upsert({
      where: { id: touchpoint.id },
      update: {},
      create: touchpoint
    });
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
