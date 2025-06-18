import { CSVDistrictData, ProcessedDistrictData } from '../types/districts'

export function parseDistrictCSV(csvText: string): CSVDistrictData[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const data: CSVDistrictData[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    // Validate required fields - only require basic info, email OR phone will be validated later
    if (row['School District Name'] && row['County'] && row['First Name'] && 
        row['Last Name'] && row['Title']) {
      data.push(row as CSVDistrictData)
    }
  }

  return data
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export function processDistrictData(csvData: CSVDistrictData[]): ProcessedDistrictData[] {
  const districtMap = new Map<string, ProcessedDistrictData>()

  csvData.forEach(row => {
    const districtKey = `${row['School District Name']}-${row['County']}`
    
    if (!districtMap.has(districtKey)) {
      districtMap.set(districtKey, {
        districtName: row['School District Name'],
        county: row['County'],
        contacts: [],
        staffDirectoryLink: row['Staff Directory Link'],
        notes: row['Notes'],
        assigned: row['Assigned']
      })
    }

    const district = districtMap.get(districtKey)!
    
    // Map CSV status to our enum
    let contactStatus: 'Valid' | 'Not Found' | 'Null' = 'Valid'
    if (row['Status']?.toLowerCase().includes('not found')) {
      contactStatus = 'Not Found'
    } else if (row['Status']?.toLowerCase().includes('null')) {
      contactStatus = 'Null'
    }

    // Clean and validate email and phone
    const email = row['Email Address']?.trim()
    const phone = row['Phone Number']?.trim()
    
    // Set to null if empty or invalid
    const validEmail = email && isValidEmail(email) ? email : null
    const validPhone = phone && phone.length > 0 ? phone : null

    district.contacts.push({
      firstName: row['First Name'],
      lastName: row['Last Name'],
      title: row['Title'],
      email: validEmail,
      phone: validPhone,
      status: contactStatus,
      notes: row['Notes']
    })
  })

  return Array.from(districtMap.values())
}

export function validateDistrictData(data: ProcessedDistrictData[]): {
  valid: ProcessedDistrictData[]
  invalid: { district: ProcessedDistrictData; errors: string[] }[]
  warnings: { district: ProcessedDistrictData; warnings: string[] }[]
} {
  const valid: ProcessedDistrictData[] = []
  const invalid: { district: ProcessedDistrictData; errors: string[] }[] = []
  const warnings: { district: ProcessedDistrictData; warnings: string[] }[] = []

  data.forEach(district => {
    const errors: string[] = []
    const districtWarnings: string[] = []

    // Validate district name
    if (!district.districtName || district.districtName.trim().length === 0) {
      errors.push('District name is required')
    }

    // Validate county
    if (!district.county || district.county.trim().length === 0) {
      errors.push('County is required')
    }

    // Validate contacts
    if (district.contacts.length === 0) {
      errors.push('At least one contact is required')
    }

    let validContactsCount = 0
    district.contacts.forEach((contact, index) => {
      const contactErrors: string[] = []
      
      if (!contact.firstName || contact.firstName.trim().length === 0) {
        contactErrors.push(`Contact ${index + 1}: First name is required`)
      }
      if (!contact.lastName || contact.lastName.trim().length === 0) {
        contactErrors.push(`Contact ${index + 1}: Last name is required`)
      }
      if (!contact.title || contact.title.trim().length === 0) {
        contactErrors.push(`Contact ${index + 1}: Title is required`)
      }
      
      // Require either email OR phone (not both)
      const hasValidEmail = contact.email && contact.email.trim().length > 0
      const hasValidPhone = contact.phone && contact.phone.trim().length > 0
      
      if (!hasValidEmail && !hasValidPhone) {
        contactErrors.push(`Contact ${index + 1}: Either email or phone number is required`)
      }

      // If contact has no errors, it's valid
      if (contactErrors.length === 0) {
        validContactsCount++
      } else {
        // Add contact errors as warnings instead of blocking the entire district
        districtWarnings.push(...contactErrors)
      }
    })

    // District is valid if it has basic info and at least one valid contact
    const hasValidContacts = validContactsCount > 0
    const hasBasicInfo = errors.length === 0 || (errors.length === 1 && errors[0] === 'At least one contact is required')

    if (hasBasicInfo && hasValidContacts) {
      valid.push(district)
      
      // Add warnings for problematic contacts
      if (districtWarnings.length > 0) {
        districtWarnings.unshift(`District has ${validContactsCount} valid contact(s) out of ${district.contacts.length} total`)
        warnings.push({ district, warnings: districtWarnings })
      }
    } else {
      // District is invalid - missing basic info or no valid contacts
      if (!hasValidContacts && district.contacts.length > 0) {
        errors.push('No valid contacts found - all contacts have errors')
      }
      invalid.push({ district, errors: [...errors, ...districtWarnings] })
    }
  })

  return { valid, invalid, warnings }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function readDistrictCSVFile(file: File): Promise<CSVDistrictData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const data = parseDistrictCSV(csvText)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
} 