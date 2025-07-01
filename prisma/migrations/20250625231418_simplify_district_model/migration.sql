/*
  Warnings:

  - You are about to drop the column `district_lead_id` on the `district_contacts` table. All the data in the column will be lost.
  - The `status` column on the `district_contacts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `district_leads` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[district_id,email]` on the table `district_contacts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `district_id` to the `district_contacts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "district_contacts" DROP CONSTRAINT "district_contacts_district_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "district_leads" DROP CONSTRAINT "district_leads_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "district_leads" DROP CONSTRAINT "district_leads_district_id_fkey";

-- AlterTable
ALTER TABLE "district_contacts" DROP COLUMN "district_lead_id",
ADD COLUMN     "campaign_id" TEXT,
ADD COLUMN     "district_id" TEXT NOT NULL,
ADD COLUMN     "last_contacted_at" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "LeadStatusType" NOT NULL DEFAULT 'not_contacted';

-- DropTable
DROP TABLE "district_leads";

-- CreateIndex
CREATE UNIQUE INDEX "district_contacts_district_id_email_key" ON "district_contacts"("district_id", "email");

-- AddForeignKey
ALTER TABLE "district_contacts" ADD CONSTRAINT "district_contacts_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_contacts" ADD CONSTRAINT "district_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
