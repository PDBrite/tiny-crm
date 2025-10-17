import { NextRequest, NextResponse } from 'next/server'
import { ProcessedDistrictData } from '@/types/districts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ImportDistrictRequest {
  districts: ProcessedDistrictData[]
  company: string
  campaign_id?: string // Optional campaign ID to associate with imported districts
  assigned_user_id?: string // Optional user ID to assign districts to
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
    skipped: number
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    // For authenticated users, ensure they have proper permissions
    if (session) {
      const userRole = session.user?.role
      const allowedCompanies = session.user?.allowedCompanies || []
      
      if (userRole !== 'admin' && userRole !== 'member') {
        return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 })
      }
    }
    
    // Test database connection
    try {
      await prisma.user.count()
    } catch (connectionError) {
      console.error('Database connection failed before import:', connectionError)
      return NextResponse.json({ 
        error: 'Database connection failed. Please check your database configuration.',
        details: connectionError instanceof Error ? connectionError.message : 'Unknown error'
      }, { status: 503 })
    }

    const { districts, company, campaign_id, assigned_user_id }: ImportDistrictRequest = await request.json()

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
        failed: 0,
        skipped: 0
      },
      message: ''
    }

    // Step 1: Find existing districts to determine which ones need to be created vs updated
    const normalize = (s?: string) => (s || '').trim().toLowerCase()

    const districtPairs = districts.map(d => ({
      name: d.districtName.trim(),
      county: d.county.trim(),
      state: 'California'
    }))

    // Query existing districts by OR of exact pairs
    const existingDistricts = await prisma.district.findMany({
      where: {
        OR: districtPairs.map(p => ({ name: p.name, county: p.county, state: p.state }))
      },
      select: { id: true, name: true, county: true, state: true }
    })

    // Create a map for quick lookups keyed by normalized name|county|state
    const existingDistrictMap = new Map<string, { id: string, name: string, county: string, state: string }>()
    existingDistricts.forEach(district => {
      const key = `${normalize(district.name)}|${normalize(district.county)}|${normalize(district.state)}`
      existingDistrictMap.set(key, district)
    })

    // Prefetch existing contacts by email (global) to avoid per-contact DB hits
    const allEmails = new Set<string>()
    districts.forEach(d => d.contacts.forEach(c => { if (c.email) allEmails.add(c.email.trim().toLowerCase()) }))
    const emailList = Array.from(allEmails)
    const existingContactsByEmail = emailList.length > 0 ? await prisma.districtContact.findMany({
      where: { email: { in: emailList } },
      select: { id: true, email: true, districtId: true, firstName: true, lastName: true }
    }) : []

    const emailContactMap = new Map<string, { id: string, email: string, districtId: string, firstName?: string, lastName?: string }>()
    existingContactsByEmail.forEach(c => {
      if (c.email) {
        const emailKey = c.email.trim().toLowerCase()
        emailContactMap.set(emailKey, { id: c.id, email: c.email, districtId: c.districtId, firstName: c.firstName, lastName: c.lastName })
      }
    })

    // Step 2: Process each district
    for (const district of districts) {
      const key = `${normalize(district.districtName)}|${normalize(district.county)}|${normalize('California')}`
      const existingDistrict = existingDistrictMap.get(key)
      
      try {
        let districtId: string
        
        if (existingDistrict) {
          // Update existing district
          result.duplicates++
          
          const updatedDistrict = await prisma.district.update({
            where: { id: existingDistrict.id },
            data: {
              website: district.staffDirectoryLink,
              notes: district.notes,
              updatedAt: new Date()
            }
          })
          
          districtId = updatedDistrict.id
          result.imported++
          
        } else {
          // Create new district
          const newDistrict = await prisma.district.create({
            data: {
              name: district.districtName,
              county: district.county,
              state: 'California',
              website: district.staffDirectoryLink,
              notes: district.notes
            }
          })
          
          districtId = newDistrict.id
          result.imported++
        }
        
        // Assign district to user if specified
        if (assigned_user_id) {
          try {
            // Check if assignment already exists
            const existingAssignment = await prisma.userDistrictAssignment.findFirst({
              where: {
                userId: assigned_user_id,
                districtId: districtId
              }
            })
            
            if (!existingAssignment) {
              await prisma.userDistrictAssignment.create({
                data: {
                  userId: assigned_user_id,
                  districtId: districtId
                }
              })
            }
          } catch (assignmentError) {
            console.warn('Failed to assign district to user:', assignmentError)
            result.errors.push(`Failed to assign district ${district.districtName} to user: ${assignmentError instanceof Error ? assignmentError.message : 'Unknown error'}`)
          }
        }
        
        // Process contacts for this district
        for (const contact of district.contacts) {
          try {
            const contactEmail = contact.email ? contact.email.trim().toLowerCase() : ''

            if (contactEmail) {
              const existingContact = emailContactMap.get(contactEmail)

              if (existingContact) {
                if (existingContact.districtId === districtId) {
                  // Update existing contact in same district
                  await prisma.districtContact.update({
                    where: { id: existingContact.id },
                    data: {
                      title: contact.title,
                      email: contact.email,
                      phone: contact.phone,
                      notes: contact.notes,
                      state: contact.state || 'California',
                      campaignId: campaign_id || undefined
                    }
                  })
                  result.contacts.updated++
                } else {
                  // Email exists but in a different district - skip and log
                  result.contacts.skipped++
                  result.errors.push(`Skipped contact ${contact.email} for district ${district.districtName}: already exists in another district.`)
                }
              } else {
                // Create new contact and add to email map
                const created = await prisma.districtContact.create({
                  data: {
                    districtId: districtId,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    title: contact.title,
                    email: contact.email,
                    phone: contact.phone,
                    linkedinUrl: null,
                    status: 'not_contacted',
                    notes: contact.notes,
                    state: contact.state || 'California',
                    campaignId: campaign_id || undefined
                  }
                })
                result.contacts.added++
                emailContactMap.set(contactEmail, { id: created.id, email: contactEmail, districtId })
              }
            } else {
              // No email - fallback to matching by name within district
              const existingByName = await prisma.districtContact.findFirst({
                where: {
                  districtId: districtId,
                  firstName: contact.firstName,
                  lastName: contact.lastName
                }
              })

              if (existingByName) {
                await prisma.districtContact.update({
                  where: { id: existingByName.id },
                  data: {
                    title: contact.title,
                    phone: contact.phone,
                    notes: contact.notes,
                    state: contact.state || 'California',
                    campaignId: campaign_id || undefined
                  }
                })
                result.contacts.updated++
              } else {
                await prisma.districtContact.create({
                  data: {
                    districtId: districtId,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    title: contact.title,
                    email: contact.email || null,
                    phone: contact.phone,
                    linkedinUrl: null,
                    status: 'not_contacted',
                    notes: contact.notes,
                    state: contact.state || 'California',
                    campaignId: campaign_id || undefined
                  }
                })
                result.contacts.added++
              }
            }
          } catch (contactError) {
            console.error('Error processing contact:', contactError)
            result.contacts.failed++
            result.errors.push(`Failed to process contact ${contact.firstName} ${contact.lastName}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`)
          }
        }
        
      } catch (districtError) {
        console.error('Error processing district:', districtError)
        result.failed++
        result.errors.push(`Failed to process district ${district.districtName}: ${districtError instanceof Error ? districtError.message : 'Unknown error'}`)
      }
    }
    
    // Format result message
    result.message = `Successfully imported ${result.imported} districts ` +
                    `(${result.duplicates} updated, ${result.imported - result.duplicates} new) ` +
                    `with ${result.contacts.added + result.contacts.updated} contacts ` +
                    `(${result.contacts.added} new, ${result.contacts.updated} updated)` +
                    (result.failed > 0 ? `\n${result.failed} districts failed to import.` : '') +
                    (result.contacts.failed > 0 ? `\n${result.contacts.failed} contacts failed to import.` : '')

    console.log('Import completed successfully:', result)

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
