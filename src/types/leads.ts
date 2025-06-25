export interface Campaign {
  id: string
  name: string
  company: string
  created_at: string
  outreach_sequence_id?: string
  outreach_sequence?: OutreachSequence
}

export interface Touchpoint {
  id: string
  lead_id?: string
  district_contact_id?: string
  type: 'email' | 'call' | 'linkedin_message'
  subject?: string
  content?: string
  scheduled_at?: string
  completed_at?: string
  outcome?: string
  outcome_enum?: 'replied' | 'no_answer' | 'voicemail' | 'opted_out' | 'bounced' | 'booked' | 'ignored'
  created_at: string
}

// Keep ContactAttempt as an alias for backward compatibility during transition
export type ContactAttempt = Touchpoint

export interface OutreachSequence {
  id: string
  name: string
  company: string
  description?: string
  created_at: string
  updated_at: string
  steps?: OutreachStep[]
}

export interface OutreachStep {
  id: string
  sequence_id: string
  step_order: number
  type: 'email' | 'call' | 'linkedin_message'
  name?: string
  content_link?: string
  day_offset: number
  days_after_previous?: number
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  city?: string
  state?: string
  company?: string
  linkedin_url?: string
  website_url?: string
  online_profile?: string
  source?: string
  status: string
  notes?: string
  campaign_id?: string
  campaign?: Campaign
  created_at: string
  last_contacted_at?: string
  touchpoints?: Touchpoint[]
  touchpoints_count?: number
  scheduled_touchpoints_count?: number
  // Legacy fields for backward compatibility
  contact_attempts?: ContactAttempt[]
  contact_attempts_count?: number
}

export interface SyncResults {
  syncedCount: number
  totalEmails: number
  errors?: string[]
}

// Status mapping for display
export const STATUS_DISPLAY_MAP: Record<string, string> = {
  'not_contacted': 'Not Contacted',
  'actively_contacting': 'Actively Contacting',
  'engaged': 'Engaged',
  'won': 'Won',
  'not_interested': 'Not Interested'
}

// Status descriptions for tooltips/help text
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  'not_contacted': 'Lead is in your database, but no outreach yet.',
  'actively_contacting': "You're in the process of emailing/calling/following up.",
  'engaged': "They've responded or shown interest (replied, booked a call, etc.).",
  'won': 'They became a customer or agreed to a pilot/demo.',
  'not_interested': 'Said no, ghosted after multiple follow-ups, or clearly not a fit.'
}

// Helper function to add business days to a date (skipping weekends)
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) { // Skip weekends (0 = Sunday, 6 = Saturday)
      addedDays++;
    }
  }
  return result;
}

// Helper function to replace template variables in strings
function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] !== undefined ? data[trimmedKey] : match;
  });
}

export function scheduleTouchpointsForLead(
  ids: { leadId?: string; districtContactId?: string },
  campaignStartDate: Date,
  outreachSteps: OutreachStep[],
  leadData: { first_name?: string; last_name?: string; city?: string; company?: string }
): Partial<ContactAttempt>[] {
  const scheduledTouchpoints: Partial<ContactAttempt>[] = [];
  let previousDate = new Date(campaignStartDate);
  
  const sortedSteps = [...outreachSteps].sort((a, b) => a.step_order - b.step_order);
  
  sortedSteps.forEach((step) => {
    let scheduledDate: Date;
    
    if (step.step_order === 1 || step.days_after_previous === undefined) {
      scheduledDate = addBusinessDays(campaignStartDate, step.day_offset);
    } else {
      scheduledDate = addBusinessDays(previousDate, step.days_after_previous);
    }
    
    previousDate = new Date(scheduledDate);
    
    scheduledDate.setHours(9, 0, 0, 0);
    
    const subject = replaceTemplateVariables(step.name || '', leadData);
    const content = replaceTemplateVariables(step.content_link || '', leadData);
    
    scheduledTouchpoints.push({
      lead_id: ids.leadId,
      district_contact_id: ids.districtContactId,
      type: step.type,
      subject,
      content,
      scheduled_at: scheduledDate.toISOString().split('T')[0] + 'T09:00:00.000Z',
    });
  });
  
  return scheduledTouchpoints;
} 