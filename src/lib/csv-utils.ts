import Papa from 'papaparse'
import { Lead } from '../types/database'

export interface CSVLead {
  firstName: string
  lastName: string
  email: string
  phone?: string
  city?: string
  source?: string
  industry?: string
  websiteQuality?: string
  company?: string
  linkedinUrl?: string
  websiteUrl?: string
  onlineProfile?: string
  emailSent?: string
  callMade?: string
  response?: string
  nextStep?: string
}

export function parseCSV(file: File): Promise<CSVLead[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('CSV parsing error: ' + results.errors[0].message))
          return
        }
        
        const leads = results.data.map((row: any) => ({
          firstName: row['First Name'] || '',
          lastName: row['Last Name'] || '',
          email: row['Email'] || '',
          phone: row['Phone Number'] || '',
          city: row['City/State'] || '',
          source: determineSource(row['Online Profile'], row['Linkedin URL']),
          industry: 'Real Estate',
          websiteQuality: row['Website?'] === 'Yes' || row['Website?'] === 'yes' ? '8' : '0',
          company: row['Company'] || '',
          linkedinUrl: row['Linkedin URL'] || '',
          websiteUrl: row['Website Link'] || '',
          onlineProfile: row['Online Profile'] || '',
          emailSent: row['Email Sent?'] || '',
          callMade: row['Call Made?'] || '',
          response: row['Response'] || '',
          nextStep: row['Next Step / Notes'] || ''
        }))
        
        resolve(leads)
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

function determineSource(onlineProfile?: string, linkedinUrl?: string): string {
  if (onlineProfile?.includes('zillow.com')) return 'Zillow'
  if (linkedinUrl?.includes('linkedin.com')) return 'LinkedIn'
  if (onlineProfile?.includes('realtor.com')) return 'Realtor.com'
  return 'Cold Outreach'
}

function extractCityFromCityState(cityState?: string): string {
  if (!cityState) return ''
  
  const cleanCityState = cityState.replace(/,$/, '').trim()
  const parts = cleanCityState.split(',')
  return parts[0]?.trim() || ''
}

export interface ValidationError {
  lead: CSVLead
  errors: string[]
  rowIndex: number
}

export function validateLeads(leads: CSVLead[]): { valid: CSVLead[], invalid: ValidationError[] } {
  const valid: CSVLead[] = []
  const invalid: ValidationError[] = []
  
  leads.forEach((lead, index) => {
    const errors: string[] = []
    
    // Check required fields
    if (!lead.firstName || lead.firstName.trim() === '') {
      errors.push('Missing first name')
    }
    if (!lead.lastName || lead.lastName.trim() === '') {
      errors.push('Missing last name')
    }
    if (!lead.email || lead.email.trim() === '') {
      errors.push('Missing email address')
    } else if (!isValidEmail(lead.email)) {
      errors.push('Invalid email format')
    }
    
    // Check optional field formats
    if (lead.phone && !isValidPhone(lead.phone)) {
      errors.push('Invalid phone number format')
    }
    
    if (errors.length === 0) {
      lead.city = extractCityFromCityState(lead.city)
      valid.push(lead)
    } else {
      invalid.push({
        lead,
        errors,
        rowIndex: index + 2 // +2 because CSV rows start at 2 (1 is header)
      })
    }
  })
  
  return { valid, invalid }
}

export function deduplicateLeads(leads: CSVLead[], existingEmails: string[]): CSVLead[] {
  const seen = new Set(existingEmails.map(email => email.toLowerCase()))
  const deduplicated: CSVLead[] = []
  
  leads.forEach(lead => {
    if (!seen.has(lead.email.toLowerCase())) {
      seen.add(lead.email.toLowerCase())
      deduplicated.push(lead)
    }
  })
  
  return deduplicated
}

export function convertToLeadInsert(csvLead: CSVLead) {
  // Map city to proper enum value
  const mapCityToEnum = (cityState?: string): string | null => {
    if (!cityState) return null
    
    const cityMap: { [key: string]: string } = {
      'burbank': 'Burbank',
      'glendale': 'Glendale', 
      'los angeles': 'Los Angeles',
      'pasadena': 'Pasadena',
      'north hollywood': 'North Hollywood',
      'van nuys': 'Van Nuys',
      'sherman oaks': 'Sherman Oaks',
      'studio city': 'Studio City',
      'hollywood': 'Hollywood',
      'west hollywood': 'West Hollywood',
      'beverly hills': 'Beverly Hills',
      'santa monica': 'Santa Monica',
      'culver city': 'Culver City',
      'westwood': 'Westwood',
      'brentwood': 'Brentwood',
      'venice': 'Venice',
      'manhattan beach': 'Manhattan Beach',
      'redondo beach': 'Redondo Beach',
      'torrance': 'Torrance',
      'el segundo': 'El Segundo',
      'inglewood': 'Inglewood',
      'hawthorne': 'Hawthorne'
    }
    
    // Extract city from "City, State" format
    const city = cityState.split(',')[0]?.trim().toLowerCase()
    return cityMap[city] || 'Other'
  }

  // Map source to proper enum value
  const mapSourceToEnum = (source?: string): string => {
    if (!source) return 'Other'
    
    const sourceMap: { [key: string]: string } = {
      'zillow': 'Zillow',
      'linkedin': 'LinkedIn',
      'realtor.com': 'Realtor.com',
      'realtor': 'Realtor.com',
      'redfin': 'Redfin',
      'trulia': 'Trulia'
    }
    
    return sourceMap[source.toLowerCase()] || 'Other'
  }

  return {
    first_name: csvLead.firstName,
    last_name: csvLead.lastName,
    email: csvLead.email.toLowerCase(),
    phone: csvLead.phone || null,
    city: mapCityToEnum(csvLead.city),
    state: 'CA',
    company: csvLead.company || null,
    linkedin_url: csvLead.linkedinUrl || null,
    website_url: csvLead.websiteUrl || null,
    online_profile: csvLead.onlineProfile || null,
    source: mapSourceToEnum(csvLead.source)
  }
}

export function convertToLeadStatusInsert(csvLead: CSVLead, leadId: string, campaignId: string) {
  const emailSent = csvLead.emailSent?.toLowerCase() === 'yes' || csvLead.emailSent?.toLowerCase() === 'true'
  const callMade = csvLead.callMade?.toLowerCase() === 'yes' || csvLead.callMade?.toLowerCase() === 'true'
  
  let status = 'Not Contacted'
  if (csvLead.response && csvLead.response.trim()) {
    status = 'Responded'
  } else if (callMade) {
    status = 'Call Made'
  } else if (emailSent) {
    status = 'Email Sent'
  }
  
  return {
    lead_id: leadId,
    campaign_id: campaignId,
    status,
    email_sent: emailSent,
    call_made: callMade,
    response: csvLead.response || null,
    next_step: csvLead.nextStep || null,
    touch_count: (emailSent ? 1 : 0) + (callMade ? 1 : 0)
  }
}

export function exportToCSV(leads: Lead[], filename: string = 'san-fernando-valley-leads') {
  const csvData = leads.map(lead => ({
    'First Name': lead.first_name,
    'Last Name': lead.last_name,
    'Email': lead.email,
    'Phone Number': lead.phone || '',
    'City/State': lead.city ? `${lead.city}, CA` : '',
    'Company': lead.company || '',
    'LinkedIn URL': lead.linkedin_url || '',
    'Website Link': lead.website_url || '',
    'Online Profile': lead.online_profile || '',
    'Source': lead.source || '',
    'Status': lead.status || 'Not Contacted'
  }))
  
  const csv = Papa.unparse(csvData)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
  // Allow various phone formats: (123) 456-7890, 123-456-7890, +1-123-456-7890, etc.
  const phoneRegex = /^[\+]?[1-9]?[\-\s\(\)]?[0-9]{3}[\-\s\(\)]?[0-9]{3}[\-\s]?[0-9]{4}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
} 