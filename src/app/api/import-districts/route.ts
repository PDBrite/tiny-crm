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
        failed: 0
      },
      message: ''
    }

    // Step 1: Find existing districts to determine which ones need to be created vs updated
    const districtNames = districts.map(d => d.districtName)
    const districtCounties = districts.map(d => d.county)
    
    // Get existing districts using Prisma
    const existingDistricts = await prisma.district.findMany({
      where: {
        name: { in: districtNames },
        county: { in: districtCounties }
      },
      select: {
        id: true,
        name: true,
        county: true
      }
    })
    
    // Create a map for quick lookups
    const existingDistrictMap = new Map<string, { id: string, name: string, county: string }>()
    existingDistricts.forEach(district => {
      const key = `${district.name.toLowerCase()}-${district.county.toLowerCase()}`
      existingDistrictMap.set(key, district)
    })

    // Step 2: Process each district
    for (const district of districts) {
      const key = `${district.districtName.toLowerCase()}-${district.county.toLowerCase()}`
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
            // Check if contact already exists by email only
            let existingContact = null
            
            if (contact.email) {
              existingContact = await prisma.districtContact.findFirst({
                where: {
                  districtId: districtId,
                  email: contact.email
                }
              })
            }
            
            if (existingContact) {
              // Update existing contact
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
              // Create new contact
              await prisma.districtContact.create({
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
