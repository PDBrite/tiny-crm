# Lead Manager - Prospect Tracking Dashboard

A comprehensive prospect tracking dashboard for outbound sales campaigns across multiple brands (CraftyCode and Avalern). Built with Next.js, TypeScript, TailwindCSS, and Prisma with PostgreSQL.

![Lead Manager Dashboard](docs/dashboard-preview.png)

## 🌟 Features

### ✅ Core Features

1. **Lead Management**
   - Upload leads via CSV with automatic validation
   - Deduplicate leads based on email addresses
   - Assign leads to campaigns upon import
   - Comprehensive lead search and filtering

2. **Campaign Tracking**
   - Create and manage campaigns with brand assignment
   - Track campaign performance metrics
   - View leads assigned to each campaign
   - Campaign status management (active, queued, completed)

3. **Lead Status Pipeline**
   - Complete lead lifecycle tracking: Not Contacted → Actively Contacting → Engaged → Won → Not Interested
   - Timeline of touchpoints and interactions
   - Manual note-taking and touchpoint logging
   - Visual status indicators with color coding

4. **Advanced Filtering & Search**
   - Filter by campaign, stage, source, city, and brand
   - Full-text search across lead names, emails, and notes
   - Multi-select filtering with real-time results
   - Export filtered results to CSV

5. **Batch Export**
   - Export up to 100 filtered leads at a time
   - Custom column selection for export
   - CSV format compatible with tools like Instantly and Myphoner

6. **Multi-Brand Support**
   - Support for CraftyCode and Avalern brands
   - Brand-specific filtering and reporting
   - Color-coded brand identification

### 🎨 UI/UX Features

- Clean, modern interface with TailwindCSS
- Fully responsive design (mobile, tablet, desktop)
- Color-coded lead stages and statuses
- Interactive dashboard with real-time metrics
- Drag-and-drop CSV file upload
- Inline editing capabilities
- Loading states and error handling

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, TailwindCSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Processing**: Papaparse for CSV handling
- **Icons**: Lucide React
- **Charts**: Recharts (for analytics)
- **Styling**: TailwindCSS with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)

### 1. Clone and Install

```bash
git clone <repository-url>
cd lead-manager
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
# Database URL for Prisma
DATABASE_URL="postgresql://username:password@localhost:5432/lead_manager"

# NextAuth configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Admin user credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=adminpassword

# Member user credentials
MEMBER_EMAIL=member@example.com
MEMBER_PASSWORD=memberpassword
```

### 3. Database Setup

```bash
# Create the database schema
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📊 Database Schema

The database schema is defined in the `prisma/schema.prisma` file. Here's an overview of the main models:

### Models Overview

```
User
├── id (UUID, Primary Key)
├── email (String, Unique)
├── passwordHash (String)
├── firstName (String, Optional)
├── lastName (String, Optional)
├── role (String, Default: "user")
├── createdAt (DateTime)
└── companyAccess (UserCompanyAccess[])

Campaign
├── id (UUID, Primary Key)
├── name (String)
├── company (CompanyType: CraftyCode | Avalern)
├── description (String, Optional)
├── startDate (DateTime, Optional)
├── endDate (DateTime, Optional)
├── status (CampaignStatusType: active | completed | draft | paused)
├── outreachSequenceId (UUID, Optional)
├── instantlyCampaignId (String, Optional)
├── createdAt (DateTime)
├── outreachSequence (OutreachSequence, Optional)
├── leads (Lead[])
└── districtContacts (DistrictContact[])

Lead
├── id (UUID, Primary Key)
├── firstName (String)
├── lastName (String)
├── email (String, Unique)
├── phone (String, Optional)
├── city (String, Optional)
├── state (String, Optional)
├── company (String, Optional)
├── linkedinUrl (String, Optional)
├── websiteUrl (String, Optional)
├── onlineProfile (String, Optional)
├── source (String, Optional)
├── status (LeadStatusType)
├── notes (String, Optional)
├── campaignId (UUID, Optional)
├── createdAt (DateTime)
├── lastContactedAt (DateTime, Optional)
├── campaign (Campaign, Optional)
└── touchpoints (Touchpoint[])

District
├── id (UUID, Primary Key)
├── name (String)
├── county (String)
├── state (String, Default: "California")
├── type (String, Optional)
├── size (Int, Optional)
├── budget (Decimal, Optional)
├── website (String, Optional)
├── notes (String, Optional)
├── createdAt (DateTime)
├── updatedAt (DateTime)
└── contacts (DistrictContact[])

DistrictContact
├── id (UUID, Primary Key)
├── districtId (UUID)
├── firstName (String)
├── lastName (String)
├── title (String, Optional)
├── email (String, Optional)
├── phone (String, Optional)
├── linkedinUrl (String, Optional)
├── status (LeadStatusType)
├── notes (String, Optional)
├── campaignId (UUID, Optional)
├── createdAt (DateTime)
├── lastContactedAt (DateTime, Optional)
├── state (String, Default: "California")
├── district (District)
├── campaign (Campaign, Optional)
└── touchpoints (Touchpoint[])

OutreachSequence
├── id (UUID, Primary Key)
├── name (String)
├── company (CompanyType)
├── description (String, Optional)
├── createdAt (DateTime)
├── updatedAt (DateTime)
├── steps (OutreachStep[])
└── campaigns (Campaign[])

OutreachStep
├── id (UUID, Primary Key)
├── sequenceId (UUID)
├── stepOrder (Int)
├── type (TouchpointType)
├── name (String, Optional)
├── contentLink (String, Optional)
├── dayOffset (Int)
├── daysAfterPrevious (Int, Optional)
├── createdAt (DateTime)
├── updatedAt (DateTime)
└── sequence (OutreachSequence)

Touchpoint
├── id (UUID, Primary Key)
├── leadId (UUID, Optional)
├── districtContactId (UUID, Optional)
├── type (TouchpointType)
├── subject (String, Optional)
├── content (String, Optional)
├── scheduledAt (DateTime, Optional)
├── completedAt (DateTime, Optional)
├── outcome (String, Optional)
├── outcomeEnum (TouchpointOutcome, Optional)
├── createdAt (DateTime)
├── lead (Lead, Optional)
└── districtContact (DistrictContact, Optional)
```

## 📝 CSV Import Format

### Required Fields
- `firstName` - Lead's first name
- `lastName` - Lead's last name  
- `email` - Valid email address (used for deduplication)

### Optional Fields
- `phone` - Phone number
- `city` - Lead's city
- `source` - Lead source (e.g., "LinkedIn", "Cold Outreach")
- `state` - Lead's state/province
- `company` - Lead's company name
- `linkedinUrl` - LinkedIn profile URL
- `websiteUrl` - Website URL
- `notes` - Additional notes

### Sample CSV
```csv
firstName,lastName,email,phone,city,state,company,linkedinUrl,websiteUrl,source
John,Smith,john.smith@example.com,+1-555-0123,New York,NY,ABC Corp,https://linkedin.com/in/johnsmith,https://abccorp.com,LinkedIn
Sarah,Johnson,sarah.j@company.com,+1-555-0124,Los Angeles,CA,XYZ Inc,https://linkedin.com/in/sarahjohnson,https://xyzinc.com,Cold Outreach
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Yes |
| `NEXTAUTH_URL` | URL for NextAuth.js | Yes |
| `ADMIN_EMAIL` | Admin user email | Yes |
| `ADMIN_PASSWORD` | Admin user password | Yes |
| `MEMBER_EMAIL` | Member user email | Yes |
| `MEMBER_PASSWORD` | Member user password | Yes |

### Lead Pipeline Stages

The system supports the following lead stages:
- **Not Contacted** - Initial state
- **Actively Contacting** - Outreach in progress
- **Engaged** - Lead has responded or shown interest
- **Won** - Successfully converted to client
- **Not Interested** - Lead is no longer viable

### Touchpoint Types

Available touchpoint types for tracking interactions:
- Email
- Call
- LinkedIn Message

## 🚀 Deployment

### Vercel 


## Authentication

The application uses NextAuth.js for authentication. When properly configured, this ensures that:
- Admin users can access all data
- Member users can only access Avalern company data
- Unauthenticated users have no access

---

Built with ❤️ for efficient lead management across multiple brands.
