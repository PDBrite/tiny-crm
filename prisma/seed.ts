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

  // Create outreach sequence for Avalern
  console.log('Creating outreach sequence...');
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

  console.log('Created outreach sequence:', avalernSequence.name);

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
