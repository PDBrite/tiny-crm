import { CSVDistrictData, ProcessedDistrictData } from '../types/districts'

export function parseDistrictCSV(csvText: string): CSVDistrictData[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row.')
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  // Validate required headers
  const requiredHeaders = [
    'School District Name',
    'County', 
    'First Name',
    'Last Name',
    'Title',
    'Email Address'
  ]
  
  const missingHeaders = requiredHeaders.filter(required => 
    !headers.some(header => header.toLowerCase().includes(required.toLowerCase()))
  )
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. ` + 
      `Found columns: ${headers.join(', ')}`)
  }

  const data: CSVDistrictData[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    // Validate required fields for this row
    const rowErrors: string[] = []
    
    if (!row['School District Name']?.trim()) {
      rowErrors.push('School District Name is required')
    }
    if (!row['County']?.trim()) {
      rowErrors.push('County is required')
    }
    if (!row['First Name']?.trim()) {
      rowErrors.push('First Name is required')
    }
    if (!row['Last Name']?.trim()) {
      rowErrors.push('Last Name is required')
    }
    if (!row['Title']?.trim()) {
      rowErrors.push('Title is required')
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`)
    } else {
      data.push(row as CSVDistrictData)
    }
  }

  // Don't throw an error if there are some valid rows - just return what we have with warnings
  if (data.length === 0) {
    throw new Error('No valid data rows found in CSV file.')
  }

  // Store warnings but don't block processing
  if (errors.length > 0) {
    // Validation warnings suppressed
    
    // Store warnings in a separate property
    Object.defineProperty(data, 'warnings', {
      value: errors,
      enumerable: false
    })
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
      state: row['State']?.trim() || 'California', // Default to California if not provided
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
  duplicates: { 
    districtDuplicates: { original: ProcessedDistrictData; duplicates: ProcessedDistrictData[] }[]
    contactDuplicates: { district: string; contact: any; duplicateOf: any }[]
  }
} {
  const valid: ProcessedDistrictData[] = []
  const invalid: { district: ProcessedDistrictData; errors: string[] }[] = []
  const warnings: { district: ProcessedDistrictData; warnings: string[] }[] = []

  // Check for duplicate districts within the CSV
  const districtDuplicates: { original: ProcessedDistrictData; duplicates: ProcessedDistrictData[] }[] = []
  const districtMap = new Map<string, ProcessedDistrictData[]>()
  
  data.forEach(district => {
    const key = `${district.districtName.toLowerCase()}-${district.county.toLowerCase()}`
    if (!districtMap.has(key)) {
      districtMap.set(key, [])
    }
    districtMap.get(key)!.push(district)
  })

  // Find districts that appear multiple times
  districtMap.forEach((districts, key) => {
    if (districts.length > 1) {
      districtDuplicates.push({
        original: districts[0],
        duplicates: districts.slice(1)
      })
    }
  })

  // Check for duplicate contacts across all districts
  const contactDuplicates: { district: string; contact: any; duplicateOf: any }[] = []
  const allContactsMap = new Map<string, { district: string; contact: any }>()

  // First pass: collect all contacts and check for duplicates
  data.forEach(district => {
    district.contacts.forEach(contact => {
      // Only check for exact duplicates (same name AND same email AND same phone)
      // This is much more restrictive than before
      const nameKey = `${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`
      const emailKey = contact.email ? contact.email.toLowerCase() : 'no-email'
      const phoneKey = contact.phone ? contact.phone.replace(/\D/g, '') : 'no-phone'
      
      // Create a composite key that requires ALL fields to match
      const compositeKey = `${nameKey}-${emailKey}-${phoneKey}`

      if (allContactsMap.has(compositeKey)) {
        const existing = allContactsMap.get(compositeKey)!
        contactDuplicates.push({
          district: district.districtName,
          contact,
          duplicateOf: existing
        })
      } else {
        allContactsMap.set(compositeKey, { district: district.districtName, contact })
      }
    })
  })

  // Second pass: validate each district
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
      
      // Note: Both email and phone can be empty - no strict requirements
      // Phone number format is not strictly validated - any non-empty value is accepted

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

  return { 
    valid, 
    invalid, 
    warnings,
    duplicates: {
      districtDuplicates,
      contactDuplicates
    }
  }
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