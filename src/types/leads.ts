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
  lead_id: string
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