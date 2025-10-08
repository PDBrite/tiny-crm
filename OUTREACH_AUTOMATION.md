# 🚀 Outreach Automation System

## Overview

The Tiny CRM now includes a comprehensive outreach automation system that supports:

- **📅 Weekday-only outreach** (business days only)
- **🎯 8-touch, 10-business-day sequences** 
- **📊 Daily batch creation** (50 leads/day)
- **⏰ Automatic touchpoint scheduling**
- **📈 Performance tracking with outcomes**

## 🏗️ Database Schema

### New Tables

#### `outreach_sequences`
Defines reusable outreach sequence templates:
```sql
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company company_type NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `outreach_steps`
Individual steps within each sequence:
```sql
CREATE TABLE outreach_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES outreach_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  type touchpoint_type NOT NULL,
  subject TEXT,
  content TEXT,
  day_offset INTEGER NOT NULL, -- in business days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);
```

### Enhanced Tables

#### `campaigns` (Updated)
```sql
ALTER TABLE campaigns 
  ADD COLUMN outreach_sequence_id UUID REFERENCES outreach_sequences(id);
```

#### `touchpoints` (Enhanced)
```sql
-- New outcome enum for better tracking
CREATE TYPE touchpoint_outcome AS ENUM (
  'replied', 'no_answer', 'voicemail', 'opted_out', 
  'bounced', 'booked', 'ignored'
);

ALTER TABLE touchpoints 
  ADD COLUMN outcome_enum touchpoint_outcome;
```

## 🎯 Sample 8-Touch Real Estate Sequence

The system includes a pre-built sequence optimized for real estate leads:

| Step | Type | Day | Subject | Purpose |
|------|------|-----|---------|---------|
| 1 | Email | 0 | Quick question about your real estate goals | Initial contact |
| 2 | Call | 1 | Follow-up call | Voice connection |
| 3 | Email | 3 | Thought you might find this interesting | Value-add content |
| 4 | LinkedIn | 5 | LinkedIn connection | Social connection |
| 5 | Call | 6 | Second follow-up call | Persistence |
| 6 | Email | 8 | Last attempt - valuable resource | Final value offer |
| 7 | Call | 9 | Final call attempt | Last voice attempt |
| 8 | Email | 10 | Final touchpoint | Graceful exit |

## �� API Endpoints

### Assign Districts to Campaign
**POST** `/api/assign-districts-to-campaign`
```json
{
  "campaign_id": "uuid",
  "district_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Districts assigned to campaign successfully",
  "data": [...],
  "contacts": [...],
  "contacts_count": 17,
  "touchpoints_created": 136
}
```

### Daily Touchpoints
**GET** `/api/daily-touchpoints?type=today|overdue|all`

**Response:**
```json
{
  "today": {
    "total": 25,
    "by_type": { "email": 15, "call": 10 },
    "touchpoints": [...]
  },
  "overdue": {
    "total": 5,
    "by_type": { "call": 5 },
    "touchpoints": [...]
  },
  "summary": {
    "total_due": 30,
    "emails_due": 15,
    "calls_due": 15,
    "linkedin_due": 0
  }
}
```

**POST** `/api/daily-touchpoints` (Mark Complete)
```json
{
  "touchpointId": "uuid",
  "outcomeEnum": "replied",
  "notes": "Great conversation, interested in Q1"
}
```

## 🎨 User Interface

### Outreach Dashboard (`/outreach`)

#### Summary Cards
- **📅 Total Due Today**: All touchpoints scheduled for today
- **📧 Emails Due**: Email touchpoints to send
- **📞 Calls Due**: Phone calls to make  
- **💼 LinkedIn Messages**: LinkedIn outreach due

#### Today's Touchpoints
- Interactive list of all touchpoints due today
- Quick action buttons: "Replied", "No Answer", etc.
- Lead information and touchpoint details
- Real-time updates when marked complete

#### Batch Creation Panel
- Shows available leads count
- Campaign selection dropdown
- "Create Batch (50 leads)" button
- Next batch date calculation

#### Overdue Touchpoints
- Red-highlighted section for overdue items
- Same interaction capabilities as today's touchpoints
- Shows original due dates

## ⚙️ Business Logic

### Business Day Calculation
```typescript
function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date)
  let daysToAdd = businessDays
  
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1)
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysToAdd--
    }
  }
  
  return result
}
```

### Template Variables
The system supports dynamic content with template variables:

- `{{first_name}}` → Lead's first name
- `{{last_name}}` → Lead's last name  
- `{{city}}` → Lead's city
- `{{company}}` → Lead's company

**Example:**
```
"Hi {{first_name}}, I noticed you might be looking at real estate opportunities in {{city}}."
```
Becomes:
```
"Hi John, I noticed you might be looking at real estate opportunities in Burbank."
```

### Touchpoint Scheduling
When districts are assigned to a campaign with an outreach sequence:

1. **Fetch sequence steps** from database
2. **Calculate business days** for each step's `day_offset`
3. **Generate personalized content** using template variables
4. **Insert scheduled touchpoints** into database
5. **Update district status** to indicate active outreach

## 📊 Performance Tracking

### Outcome Tracking
Each touchpoint can be marked with specific outcomes:

- **✅ Replied**: Lead responded positively
- **📵 No Answer**: Call/message went unanswered
- **📞 Voicemail**: Left voicemail message
- **🚫 Opted Out**: Lead requested no further contact
- **📧 Bounced**: Email delivery failed
- **📅 Booked**: Meeting/appointment scheduled
- **👻 Ignored**: No response to outreach

### Reporting Capabilities
The system tracks:
- **Response rates** by touchpoint type
- **Conversion rates** by sequence step
- **Time to response** metrics
- **Campaign performance** comparisons

## 🔄 Daily Workflow

### Morning Routine
1. **Check Dashboard**: Review today's touchpoints and overdue items
2. **Process Emails**: Send scheduled email touchpoints
3. **Make Calls**: Complete phone call touchpoints
4. **LinkedIn Outreach**: Send LinkedIn messages
5. **Update Outcomes**: Mark touchpoints as complete with outcomes

### Batch Creation
1. **Select Campaign**: Choose campaign with outreach sequence
2. **Create Batch**: Process 50 new leads automatically
3. **Review Schedule**: Confirm touchpoints are properly scheduled
4. **Monitor Progress**: Track batch performance over 10 business days

## 🚀 Advanced Features

### Automatic Lead Progression
- Leads automatically move through sequence steps
- Status updates based on touchpoint completion
- Smart scheduling avoids weekends and holidays

### Sequence Customization
- Create custom sequences for different industries
- Adjust timing and content for specific campaigns
- A/B test different sequence variations

### Integration Ready
- **Instantly.ai**: Sync sent emails as completed touchpoints
- **CRM Systems**: Export/import lead data and outcomes
- **Calendar Apps**: Schedule follow-up meetings
- **Email Platforms**: Track email opens and clicks

## 📈 Success Metrics

### Key Performance Indicators (KPIs)
- **Daily Touchpoint Completion Rate**: % of scheduled touchpoints completed
- **Response Rate by Channel**: Email vs. Call vs. LinkedIn effectiveness
- **Sequence Completion Rate**: % of leads completing full 8-touch sequence
- **Conversion Rate**: % of leads becoming qualified opportunities
- **Time to First Response**: Average days until lead responds

### Optimization Opportunities
- **Best Performing Steps**: Identify which touchpoints generate most responses
- **Optimal Timing**: Determine best days/times for each touchpoint type
- **Content Performance**: Test different subject lines and message content
- **Sequence Length**: Experiment with shorter/longer sequences

## 🔧 Technical Implementation

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── assign-districts-to-campaign/route.ts
│   │   ├── daily-touchpoints/route.ts
│   │   └── campaigns/route.ts
│   └── outreach/page.tsx
├── types/leads.ts (enhanced)
├── utils/outreach-scheduler.ts
└── components/leads/ (existing)
```

### Database Migrations
```sql
-- Run this migration to set up outreach automation
supabase/migrations/20241201000001_add_outreach_sequences.sql
```

### Environment Setup
No additional environment variables required - uses existing Supabase configuration.

## 🎯 Next Steps

### Phase 2 Enhancements
1. **Email Templates**: Rich HTML email templates with tracking
2. **Calendar Integration**: Automatic meeting scheduling
3. **SMS Support**: Add text messaging touchpoints
4. **AI Content**: Generate personalized content using AI
5. **Advanced Analytics**: Detailed performance dashboards

### Integration Roadmap
1. **Instantly.ai**: ✅ Complete (v2 API)
2. **HubSpot**: Sync leads and activities
3. **Salesforce**: Enterprise CRM integration
4. **Calendly**: Automatic meeting booking
5. **Twilio**: SMS touchpoint support

This outreach automation system transforms the Tiny CRM from a simple CRM into a powerful sales automation platform, enabling systematic, scalable outreach while maintaining personal touch through customized messaging and business-day-aware scheduling. 