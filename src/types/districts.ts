export interface DistrictLead {
  id: string
  district_name: string
  county: string
  company: string
  status: 'not_contacted' | 'actively_contacting' | 'engaged' | 'won' | 'not_interested'
  campaign_id?: string
  staff_directory_link?: string
  notes?: string
  assigned_to?: string
  created_at: string
  updated_at: string
  last_contacted_at?: string
  
  // Computed fields
  contacts_count?: number
  valid_contacts_count?: number
  touchpoints_count?: number
  
  // Relationships
  district_contacts?: DistrictContact[]
  campaign?: {
    id: string
    name: string
    company: string
  }
}

export interface DistrictContact {
  id: string
  district_lead_id: string
  first_name: string
  last_name: string
  title: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string | null
  state: string | null
  district_lead?: DistrictLead
  touchpoints_count?: number
  scheduled_touchpoints_count?: number
}

export interface CSVDistrictData {
  'School District Name': string
  'County': string
  'First Name': string
  'Last Name': string
  'Title': string
  'Email Address': string
  'Phone Number'?: string
  'State'?: string
  'Staff Directory Link'?: string
  'Status': string
  'Assigned'?: string
  'Notes'?: string
}

export interface ProcessedDistrictData {
  districtName: string
  county: string
  contacts: {
    firstName: string
    lastName: string
    title: string
    email: string | null
    phone?: string | null
    state?: string | null
    status: 'Valid' | 'Not Found' | 'Null'
    notes?: string
  }[]
  staffDirectoryLink?: string
  notes?: string
  assigned?: string
}

export const DISTRICT_STATUS_DISPLAY_MAP = {
  'not_contacted': 'Not Contacted',
  'actively_contacting': 'Actively Contacting',
  'engaged': 'Engaged',
  'won': 'Won',
  'not_interested': 'Not Interested'
} as const 