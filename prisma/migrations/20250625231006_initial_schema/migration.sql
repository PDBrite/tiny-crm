-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('CraftyCode', 'Avalern');

-- CreateEnum
CREATE TYPE "TouchpointType" AS ENUM ('email', 'call', 'linkedin_message');

-- CreateEnum
CREATE TYPE "TouchpointOutcome" AS ENUM ('replied', 'no_answer', 'voicemail', 'opted_out', 'bounced', 'booked', 'ignored');

-- CreateEnum
CREATE TYPE "LeadStatusType" AS ENUM ('not_contacted', 'actively_contacting', 'engaged', 'won', 'not_interested');

-- CreateEnum
CREATE TYPE "CampaignStatusType" AS ENUM ('active', 'completed', 'draft', 'paused');

-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company" "CompanyType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" "CompanyType" NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outreach_sequence_id" TEXT,
    "instantly_campaign_id" TEXT,
    "status" "CampaignStatusType" NOT NULL DEFAULT 'draft',

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "company" TEXT,
    "linkedin_url" TEXT,
    "website_url" TEXT,
    "online_profile" TEXT,
    "source" TEXT,
    "status" "LeadStatusType" NOT NULL DEFAULT 'not_contacted',
    "notes" TEXT,
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contacted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'California',
    "type" TEXT,
    "size" INTEGER,
    "budget" DECIMAL(12,2),
    "website" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_leads" (
    "id" TEXT NOT NULL,
    "district_name" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "company" "CompanyType" NOT NULL,
    "status" "LeadStatusType" NOT NULL DEFAULT 'not_contacted',
    "notes" TEXT,
    "campaign_id" TEXT,
    "district_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contacted_at" TIMESTAMP(3),

    CONSTRAINT "district_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_contacts" (
    "id" TEXT NOT NULL,
    "district_lead_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Valid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'California',

    CONSTRAINT "district_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" "CompanyType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_steps" (
    "id" TEXT NOT NULL,
    "sequence_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "type" "TouchpointType" NOT NULL,
    "name" TEXT,
    "content_link" TEXT,
    "day_offset" INTEGER NOT NULL,
    "days_after_previous" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "touchpoints" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "district_contact_id" TEXT,
    "type" "TouchpointType" NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "outcome_enum" "TouchpointOutcome",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "touchpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_access_user_id_company_key" ON "user_company_access"("user_id", "company");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_county_state_key" ON "districts"("name", "county", "state");

-- CreateIndex
CREATE UNIQUE INDEX "district_leads_district_name_county_key" ON "district_leads"("district_name", "county");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_steps_sequence_id_step_order_key" ON "outreach_steps"("sequence_id", "step_order");

-- AddForeignKey
ALTER TABLE "user_company_access" ADD CONSTRAINT "user_company_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_outreach_sequence_id_fkey" FOREIGN KEY ("outreach_sequence_id") REFERENCES "outreach_sequences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_leads" ADD CONSTRAINT "district_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_leads" ADD CONSTRAINT "district_leads_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_contacts" ADD CONSTRAINT "district_contacts_district_lead_id_fkey" FOREIGN KEY ("district_lead_id") REFERENCES "district_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_steps" ADD CONSTRAINT "outreach_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "outreach_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoints" ADD CONSTRAINT "touchpoints_district_contact_id_fkey" FOREIGN KEY ("district_contact_id") REFERENCES "district_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
