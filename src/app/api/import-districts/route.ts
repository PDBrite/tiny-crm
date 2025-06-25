import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, testSupabaseConnection } from '@/lib/supabase'
import { ProcessedDistrictData } from '@/types/districts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ImportDistrictRequest {
  districts: ProcessedDistrictData[]
  company: string
  campaign_id?: string // Optional campaign ID to associate with imported districts
}

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
  duplicates: number
  contacts: {
    added: number
    updated: number
    failed: number
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Ensure the admin client is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set.' },
        { status: 500 }
      )
    }
    // Check authentication
    const session = await getServerSession(authOptions)
    
    // For public imports without authentication, we can use the anon policy
    // But for authenticated users, ensure they have proper permissions
    if (session) {
      const userRole = session.user?.role
      const allowedCompanies = session.user?.allowedCompanies || []
      
      if (userRole !== 'admin' && userRole !== 'member') {
        return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 })
      }
    }
    
    // Test Supabase connection first
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.error('Supabase connection failed before import:', connectionTest.error)
      return NextResponse.json({ 
        error: 'Database connection failed. Please ensure Supabase is running.',
        details: connectionTest.error,
        hint: 'If using local Supabase, run: supabase start'
      }, { status: 503 })
    }

    const { districts, company, campaign_id }: ImportDistrictRequest = await request.json()

    if (!districts || !Array.isArray(districts)) {
      return NextResponse.json({ error: 'Invalid districts data' }, { status: 400 })
    }

    if (company !== 'Avalern') {
      return NextResponse.json({ error: 'District imports are only available for Avalern' }, { status: 403 })
    }

    // Initialize result object
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
      duplicates: 0,
      contacts: {
        added: 0,
        updated: 0,
        failed: 0
      },
      message: ''
    }

    // Step 1: Find existing districts to determine which ones need to be created vs updated
    const districtNames = districts.map(d => d.districtName)
    const districtCounties = districts.map(d => d.county)
    
    // Get existing districts in a single query - use supabaseAdmin to bypass RLS
    const { data: existingDistricts, error: queryError } = await supabaseAdmin
      .from('district_leads')
      .select('id, district_name, county')
      .eq('company', company)
      .in('district_name', districtNames)
      .in('county', districtCounties)
    
    if (queryError) {
      console.error('Error querying existing districts:', queryError)
      return NextResponse.json({ error: 'Failed to query existing districts' }, { status: 500 })
    }
    
    // Create a map for quick lookups
    const existingDistrictMap = new Map<string, { id: string, district_name: string, county: string }>()
    existingDistricts?.forEach(district => {
      const key = `${district.district_name.toLowerCase()}-${district.county.toLowerCase()}`
      existingDistrictMap.set(key, district)
    })

    // Step 2: Prepare batches for insertion and updates
    const districtsToCreate: any[] = []
    const districtsToUpdate: { id: string, data: any }[] = []
    const districtIdMap = new Map<string, string>() // Maps district name+county to ID for new districts
    
    // Process each district
    districts.forEach(district => {
      const key = `${district.districtName.toLowerCase()}-${district.county.toLowerCase()}`
      // Check if we've already processed this district in the current import
      if (districtIdMap.has(key)) {
        return // Skip district creation, just process contacts later
      }

      const existingDistrict = existingDistrictMap.get(key)
      
      if (existingDistrict) {
        // Update existing district
        result.duplicates++
                  districtsToUpdate.push({
            id: existingDistrict.id,
            data: {
              staff_directory_link: district.staffDirectoryLink,
              notes: district.notes, // Use the new notes, don't try to access notes from existingDistrict
              assigned_to: district.assigned,
              updated_at: new Date().toISOString(),
              campaign_id: campaign_id || null // Only update campaign if provided
            }
          })
        
        // Store ID for contact association
        districtIdMap.set(key, existingDistrict.id)
      } else {
        // Create new district
        const newDistrict = {
          district_name: district.districtName,
          county: district.county,
          company: company,
          staff_directory_link: district.staffDirectoryLink,
          notes: district.notes,
          assigned_to: district.assigned,
          status: 'not_contacted',
          campaign_id: campaign_id || null
        }
        districtsToCreate.push(newDistrict)
        
        // We'll set the ID after creation, but we need to mark it as seen
        // Use a placeholder value; it will be overwritten after the insert.
        districtIdMap.set(key, 'pending')
      }
    })
    
    // Step 3: Batch create new districts - use supabaseAdmin to bypass RLS
    if (districtsToCreate.length > 0) {
      const { data: createdDistricts, error: createError } = await supabaseAdmin
        .from('district_leads')
        .insert(districtsToCreate)
        .select('id, district_name, county')
      
      if (createError) {
        console.error('Error creating districts:', createError)
        result.failed += districtsToCreate.length
        result.errors.push(`Failed to create ${districtsToCreate.length} districts: ${createError.message}`)
      } else {
        result.imported += createdDistricts?.length || 0
        
        // Map newly created districts to their IDs
        createdDistricts?.forEach(district => {
          const key = `${district.district_name.toLowerCase()}-${district.county.toLowerCase()}`
          districtIdMap.set(key, district.id)
        })
      }
    }
    
    // Step 4: Batch update existing districts - use supabaseAdmin to bypass RLS
    for (const district of districtsToUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from('district_leads')
        .update(district.data)
        .eq('id', district.id)
      
      if (updateError) {
        console.error(`Error updating district ${district.id}:`, updateError)
        result.failed++
        result.errors.push(`Failed to update district ${district.id}: ${updateError.message}`)
      } else {
        result.imported++
      }
    }
    
    // Step 5: Process contacts for all districts
    for (const district of districts) {
      const key = `${district.districtName.toLowerCase()}-${district.county.toLowerCase()}`
      const districtId = districtIdMap.get(key)
      
      if (!districtId) {
        result.errors.push(`Could not find ID for district ${district.districtName}`)
        continue
      }
      
      // Get existing contacts for this district - use supabaseAdmin to bypass RLS
      const { data: existingContacts, error: contactsError } = await supabaseAdmin
        .from('district_contacts')
        .select('id, first_name, last_name, email')
        .eq('district_lead_id', districtId)
      
      if (contactsError) {
        console.error(`Error fetching contacts for district ${districtId}:`, contactsError)
        result.contacts.failed += district.contacts.length
        continue
      }
      
      // Create a map for quick lookups
      const existingContactMap = new Map<string, any>()
      existingContacts?.forEach(contact => {
        // Create keys based on name and email
        const nameKey = `${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`
        existingContactMap.set(nameKey, contact)
        
        if (contact.email) {
          const emailKey = contact.email.toLowerCase()
          existingContactMap.set(emailKey, contact)
        }
      })
      
      // Process each contact
      const contactsToCreate: any[] = []
      const contactsToUpdate: { id: string, data: any }[] = []
      
      district.contacts.forEach(contact => {
        // Try to find by name first, then by email
        const nameKey = `${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`
        const emailKey = contact.email ? contact.email.toLowerCase() : null
        
        const existingContact = existingContactMap.get(nameKey) || 
                               (emailKey ? existingContactMap.get(emailKey) : null)
        
        if (existingContact) {
          // Update existing contact
          contactsToUpdate.push({
            id: existingContact.id,
            data: {
              title: contact.title,
              email: contact.email,
              phone: contact.phone,
              state: contact.state || 'California', // Default to California if not provided
              status: contact.status,
              notes: contact.notes,
              updated_at: new Date().toISOString()
            }
          })
        } else {
          // Create new contact if it has required fields
          if (contact.firstName && contact.lastName && contact.title) {
            contactsToCreate.push({
              district_lead_id: districtId,
              first_name: contact.firstName,
              last_name: contact.lastName,
              title: contact.title,
              email: contact.email,
              phone: contact.phone,
              state: contact.state || 'California', // Default to California if not provided
              status: contact.status || 'Valid',
              notes: contact.notes
            })
          } else {
            result.contacts.failed++
          }
        }
      })
      
      // Batch create new contacts - use supabaseAdmin to bypass RLS
      if (contactsToCreate.length > 0) {
        const { data: createdContacts, error: createError } = await supabaseAdmin
          .from('district_contacts')
          .insert(contactsToCreate)
        
        if (createError) {
          console.error(`Error creating contacts for district ${districtId}:`, createError)
          result.contacts.failed += contactsToCreate.length
        } else {
          result.contacts.added += contactsToCreate.length
        }
      }
      
      // Batch update existing contacts - use supabaseAdmin to bypass RLS
      for (const contact of contactsToUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('district_contacts')
          .update(contact.data)
          .eq('id', contact.id)
        
        if (updateError) {
          console.error(`Error updating contact ${contact.id}:`, updateError)
          result.contacts.failed++
        } else {
          result.contacts.updated++
        }
      }
    }
    
    // Step 6: Format result message
    result.message = `Successfully imported ${result.imported} districts ` +
                    `(${result.duplicates} updated, ${result.imported - result.duplicates} new) ` +
                    `with ${result.contacts.added + result.contacts.updated} contacts ` +
                    `(${result.contacts.added} new, ${result.contacts.updated} updated)` +
                    (result.failed > 0 ? `\n${result.failed} districts failed to import.` : '') +
                    (result.contacts.failed > 0 ? `\n${result.contacts.failed} contacts failed to import.` : '')

    return NextResponse.json({
      ...result,
      errors: result.errors.length > 0 ? result.errors : undefined
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import districts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 