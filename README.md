# Lead Manager - Prospect Tracking Dashboard

A comprehensive prospect tracking dashboard for outbound sales campaigns across multiple brands (CraftyCode and Avalern). Built with Next.js, TypeScript, TailwindCSS, and Supabase.

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
   - Complete lead lifecycle tracking: Not Contacted → Emailed → Warm → Called → Booked → Won → Lost
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
- **Backend**: Supabase (PostgreSQL database, Auth, Real-time)
- **File Processing**: Papaparse for CSV handling
- **Icons**: Lucide React
- **Charts**: Recharts (for analytics)
- **Styling**: TailwindCSS with responsive design

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
git clone <repository-url>
cd lead-manager
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from Settings > API
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  city TEXT,
  source TEXT,
  industry TEXT,
  website_quality INTEGER CHECK (website_quality >= 1 AND website_quality <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  launch_date DATE NOT NULL,
  brand TEXT NOT NULL CHECK (brand IN ('CraftyCode', 'Avalern')),
  status TEXT NOT NULL CHECK (status IN ('active', 'queued', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lead_status table
CREATE TABLE lead_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Not Contacted', 'Emailed', 'Warm', 'Called', 'Booked', 'Won', 'Lost')),
  last_touch TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  touch_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create touchpoints table
CREATE TABLE touchpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Email 1', 'Email 2', 'Email 3', 'Call 1', 'Call 2', 'Call 3', 'LinkedIn Connect', 'LinkedIn Message', 'Manual Note')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_lead_status_lead_id ON lead_status(lead_id);
CREATE INDEX idx_lead_status_campaign_id ON lead_status(campaign_id);
CREATE INDEX idx_touchpoints_lead_id ON touchpoints(lead_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your auth setup)
CREATE POLICY "Enable all operations for authenticated users" ON leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON lead_status FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all operations for authenticated users" ON touchpoints FOR ALL USING (auth.role() = 'authenticated');
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📊 Database Schema

### Tables Overview

```
leads
├── id (UUID, Primary Key)
├── first_name (TEXT, Required)
├── last_name (TEXT, Required)
├── email (TEXT, Required, Unique)
├── phone (TEXT, Optional)
├── city (TEXT, Optional)
├── source (TEXT, Optional)
├── industry (TEXT, Optional)
├── website_quality (INTEGER, 1-10)
└── created_at (TIMESTAMP)

campaigns
├── id (UUID, Primary Key)
├── name (TEXT, Required)
├── launch_date (DATE, Required)
├── brand (TEXT, Required: 'CraftyCode' | 'Avalern')
├── status (TEXT, Required: 'active' | 'queued' | 'completed')
└── created_at (TIMESTAMP)

lead_status
├── id (UUID, Primary Key)
├── lead_id (UUID, Foreign Key → leads.id)
├── campaign_id (UUID, Foreign Key → campaigns.id)
├── status (TEXT, Required: Pipeline stages)
├── last_touch (TIMESTAMP, Optional)
├── notes (TEXT, Optional)
├── touch_count (INTEGER, Default: 0)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

touchpoints
├── id (UUID, Primary Key)
├── lead_id (UUID, Foreign Key → leads.id)
├── type (TEXT, Required: Touchpoint types)
├── description (TEXT, Required)
└── created_at (TIMESTAMP)
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
- `industry` - Lead's industry
- `websiteQuality` - Website quality score (1-10)

### Sample CSV
```csv
firstName,lastName,email,phone,city,source,industry,websiteQuality
John,Smith,john.smith@example.com,+1-555-0123,New York,LinkedIn,Technology,8
Sarah,Johnson,sarah.j@company.com,+1-555-0124,Los Angeles,Cold Outreach,Healthcare,6
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

### Lead Pipeline Stages

The system supports the following lead stages:
- **Not Contacted** - Initial state
- **Emailed** - First email sent
- **Warm** - Lead has responded or shown interest
- **Called** - Phone contact attempted/made
- **Booked** - Meeting or demo scheduled
- **Won** - Successfully converted to client
- **Lost** - Lead is no longer viable

### Touchpoint Types

Available touchpoint types for tracking interactions:
- Email 1, Email 2, Email 3
- Call 1, Call 2, Call 3
- LinkedIn Connect, LinkedIn Message
- Manual Note

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed information when reporting bugs

## 🔮 Roadmap

- [ ] Advanced analytics and reporting
- [ ] Email integration for automated outreach
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Team collaboration features
- [ ] Mobile app for lead management
- [ ] AI-powered lead scoring
- [ ] Automated follow-up sequences

## 🔗 Instantly Integration

The Lead Manager includes integration with Instantly.ai to automatically sync sent emails as contact attempts.

### Setup

1. **Get your Instantly API Key**
   - Log into your Instantly.ai account
   - Navigate to Settings → API
   - Generate or copy your API key

2. **Add Environment Variable**
   ```bash
   # Add to your .env.local file
   INSTANTLY_API_KEY=your_instantly_api_key_here
   ```

3. **Sync Emails**
   - Click the "Sync Instantly" button on the Leads page
   - The system will fetch sent emails from Instantly
   - Emails are automatically added as contact attempts
   - Duplicate emails are skipped to prevent duplicates

### How It Works

- **Automatic Deduplication**: The system checks for existing contact attempts to prevent duplicates
- **Email Matching**: Emails are matched to leads by email address
- **Contact Attempt Creation**: Each sent email becomes a contact attempt with:
  - Type: Email
  - Subject: Email subject line
  - Date: When the email was sent
  - Content: Notes about the Instantly campaign
  - Outcome: Email delivery status

### Sync Options

- **Selected Leads**: If you have leads selected, only those leads will be synced
- **All Leads**: If no leads are selected, all visible leads will be synced
- **Batch Processing**: The system handles large numbers of leads efficiently

## Authentication and Deployment

### Environment Variables

When deploying to Vercel, make sure to set the following environment variables:

```
# NextAuth Configuration
NEXTAUTH_URL=https://your-deployed-url.vercel.app
NEXTAUTH_SECRET=your-secure-random-string

# User Authentication
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password
MEMBER_EMAIL=member@example.com
MEMBER_PASSWORD=secure-member-password

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Fixing Row-Level Security (RLS) Errors

If you encounter errors like `new row violates row-level security policy for table "district_leads"`, it means your authentication isn't properly set up. Make sure:

1. You're logged in with a user that has the correct role ('admin' or 'member')
2. The JWT claims are properly being sent to Supabase
3. All environment variables are correctly set in your Vercel deployment

The application uses NextAuth.js for authentication and sets JWT claims for Supabase RLS policies. When properly configured, this ensures that:
- Admin users can access all data
- Member users can only access Avalern company data
- Unauthenticated users have limited access

---

Built with ❤️ for efficient lead management across multiple brands.
