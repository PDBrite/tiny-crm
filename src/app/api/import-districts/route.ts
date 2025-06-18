import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ProcessedDistrictData } from '@/types/districts'

interface ImportDistrictRequest {
  districts: ProcessedDistrictData[]
  company: string
}

export async function POST(request: NextRequest) {
  try {
    const { districts, company }: ImportDistrictRequest = await request.json()

    if (!districts || !Array.isArray(districts)) {
      return NextResponse.json({ error: 'Invalid districts data' }, { status: 400 })
    }

    if (company !== 'Avalern') {
      return NextResponse.json({ error: 'District imports are only available for Avalern' }, { status: 403 })
    }

    let importedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const districtData of districts) {
      try {
        // Check if district already exists
        const { data: existingDistrict } = await supabase
          .from('district_leads')
          .select('id')
          .eq('district_name', districtData.districtName)
          .eq('county', districtData.county)
          .eq('company', company)
          .single()

        let districtId: string

        if (existingDistrict) {
          // Update existing district
          const { data: updatedDistrict, error: updateError } = await supabase
            .from('district_leads')
            .update({
              staff_directory_link: districtData.staffDirectoryLink,
              notes: districtData.notes,
              assigned_to: districtData.assigned,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingDistrict.id)
            .select('id')
            .single()

          if (updateError) {
            throw new Error(`Failed to update district: ${updateError.message}`)
          }

          districtId = existingDistrict.id
        } else {
          // Create new district
          const { data: newDistrict, error: insertError } = await supabase
            .from('district_leads')
            .insert({
              district_name: districtData.districtName,
              county: districtData.county,
              company: company,
              staff_directory_link: districtData.staffDirectoryLink,
              notes: districtData.notes,
              assigned_to: districtData.assigned,
              status: 'not_contacted'
            })
            .select('id')
            .single()

          if (insertError) {
            throw new Error(`Failed to create district: ${insertError.message}`)
          }

          districtId = newDistrict.id
        }

        // Process contacts for this district
        for (const contactData of districtData.contacts) {
          try {
            // Check if contact already exists - use name + email/phone combination for uniqueness
            const { data: existingContact } = await supabase
              .from('district_contacts')
              .select('id')
              .eq('district_lead_id', districtId)
              .eq('first_name', contactData.firstName)
              .eq('last_name', contactData.lastName)
              .single()

            if (existingContact) {
              // Update existing contact
              await supabase
                .from('district_contacts')
                .update({
                  title: contactData.title,
                  email: contactData.email,
                  phone: contactData.phone,
                  status: contactData.status,
                  notes: contactData.notes,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingContact.id)
            } else {
              // Create new contact
              await supabase
                .from('district_contacts')
                .insert({
                  district_lead_id: districtId,
                  first_name: contactData.firstName,
                  last_name: contactData.lastName,
                  title: contactData.title,
                  email: contactData.email,
                  phone: contactData.phone,
                  status: contactData.status,
                  notes: contactData.notes
                })
            }
          } catch (contactError) {
            console.error('Error processing contact:', contactError)
            errors.push(`Failed to process contact ${contactData.firstName} ${contactData.lastName}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`)
          }
        }

        importedCount++
      } catch (districtError) {
        console.error('Error processing district:', districtError)
        failedCount++
        errors.push(`Failed to process district ${districtData.districtName}: ${districtError instanceof Error ? districtError.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} districts${failedCount > 0 ? ` (${failedCount} failed)` : ''}`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import districts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 