// Database Types for Lead Manager - San Fernando Valley Real Estate
export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          city?: string
          state?: string
          company?: string
          linkedin_url?: string
          website_url?: string
          online_profile?: string
          source: string
          status: string
          campaign_id?: string
          created_at: string
          updated_at: string
          last_contacted_at?: string
          notes?: string
        }
        Insert: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          city?: string
          state?: string
          company?: string
          linkedin_url?: string
          website_url?: string
          online_profile?: string
          source?: string
          status?: string
          campaign_id?: string
          created_at?: string
          updated_at?: string
          last_contacted_at?: string
          notes?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          city?: string
          state?: string
          company?: string
          linkedin_url?: string
          website_url?: string
          online_profile?: string
          source?: string
          status?: string
          campaign_id?: string
          created_at?: string
          updated_at?: string
          last_contacted_at?: string
          notes?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          company: string
          description?: string
          start_date?: string
          end_date?: string
          target_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          company: string
          description?: string
          start_date?: string
          end_date?: string
          target_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          company?: string
          description?: string
          start_date?: string
          end_date?: string
          target_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      touchpoints: {
        Row: {
          id: string
          lead_id: string
          type: string
          subject?: string
          content?: string
          scheduled_at?: string
          completed_at?: string
          outcome?: string
          created_at: string
          created_by?: string
        }
        Insert: {
          id?: string
          lead_id: string
          type: string
          subject?: string
          content?: string
          scheduled_at?: string
          completed_at?: string
          outcome?: string
          created_at?: string
          created_by?: string
        }
        Update: {
          id?: string
          lead_id?: string
          type?: string
          subject?: string
          content?: string
          scheduled_at?: string
          completed_at?: string
          outcome?: string
          created_at?: string
          created_by?: string
        }
      }
    }
  }
}

// Application Types
export type Lead = Database['public']['Tables']['leads']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Touchpoint = Database['public']['Tables']['touchpoints']['Row']

export type LeadWithCampaign = Lead & {
  campaign?: Campaign
}

export type LeadWithTouchpoints = Lead & {
  touchpoints?: Touchpoint[]
}

export type CampaignWithStats = Campaign & {
  lead_count?: number
  conversion_rate?: number
}

// CSV import types
export interface CSVLead {
  'First Name': string;
  'Last Name': string;
  'Email': string;
  'Phone Number': string;
  'City/State': string;
  'Company': string;
  'Linkedin URL': string;
  'Website Link': string;
  'Online Profile': string;
  'Website?': string;
  'Email Sent?': string;
  'Call Made?': string;
  'Response': string;
  'Next Step / Notes': string;
}

// Constants and Enums
export const COMPANIES = ['CraftyCode', 'Avalern'] as const
export const CAMPAIGN_STATUS = ['active', 'queued', 'completed'] as const
export const LEAD_STAGES = [
  'Not Contacted',
  'Email Sent',
  'Call Made',
  'Responded',
  'Interested', 
  'Meeting Scheduled',
  'Proposal Sent',
  'Closed Won',
  'Closed Lost'
] as const

export type Company = typeof COMPANIES[number]
export type CampaignStatus = typeof CAMPAIGN_STATUS[number]
export type LeadStage = typeof LEAD_STAGES[number] 