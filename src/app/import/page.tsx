'use client'

import { useState, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { parseCSV, validateLeads, convertToLeadInsert, CSVLead } from '../../lib/csv-utils'
import { readDistrictCSVFile, processDistrictData, validateDistrictData } from '../../lib/district-csv-utils'
import { ProcessedDistrictData, CSVDistrictData } from '../../types/districts'
import { supabase } from '../../lib/supabase'
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  ExternalLink,
  Users
} from 'lucide-react'

interface ValidationError {
  lead: CSVLead
  errors: string[]
  rowIndex: number
}

interface ValidationResult {
  valid: CSVLead[]
  invalid: ValidationError[]
  duplicates: { email: string; existingLeadName?: string; rowIndex: number; lead: CSVLead }[]
}

interface DistrictValidationResult {
  valid: ProcessedDistrictData[]
  invalid: { district: ProcessedDistrictData; errors: string[] }[]
  warnings: { district: ProcessedDistrictData; warnings: string[] }[]
}

interface ImportResult {
  imported: number
  failed: number
  duplicatesSkipped: number
  errors: string[]
}

export default function ImportPage() {
  const { selectedCompany } = useCompany()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [districtValidationResult, setDistrictValidationResult] = useState<DistrictValidationResult | null>(null)
  const [previewLeads, setPreviewLeads] = useState<CSVLead[]>([])
  const [previewDistricts, setPreviewDistricts] = useState<ProcessedDistrictData[]>([])
  const [showAllInvalid, setShowAllInvalid] = useState(false)
  const [showAllDuplicates, setShowAllDuplicates] = useState(false)
  

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setFile(files[0])
      processFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    
    try {
      console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type)
      
      if (selectedCompany === 'Avalern') {
        // Process district CSV for Avalern
        try {
          const csvData = await readDistrictCSVFile(file)
          console.log('Parsed district CSV:', csvData.length, 'rows')
          
          if (csvData.length === 0) {
            throw new Error('No valid district data found in CSV. Please check the file format.')
          }
          
          const processedDistricts = processDistrictData(csvData)
          console.log('Processed districts:', processedDistricts.length)
          
          if (processedDistricts.length === 0) {
            throw new Error('No districts could be processed from the CSV data. Please check the required columns: School District Name, County, First Name, Last Name, Title, Email Address.')
          }
          
          const { valid, invalid, warnings } = validateDistrictData(processedDistricts)
          console.log('Validation results - Valid:', valid.length, 'Invalid:', invalid.length, 'Warnings:', warnings.length)
          
          setDistrictValidationResult({ valid, invalid, warnings: warnings || [] })
          setPreviewDistricts(valid.slice(0, 3)) // Show first 3 districts
          
          // Clear individual lead results
          setValidationResult(null)
          setPreviewLeads([])
          
        } catch (districtError) {
          console.error('District processing error:', districtError)
          // If district processing fails, try as regular leads CSV
          console.log('District processing failed, trying as regular leads CSV...')
          await processAsLeads(file)
        }
        
      } else {
        // Process individual leads CSV for CraftyCode
        await processAsLeads(file)
      }
      
    } catch (error) {
      console.error('Detailed error processing file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Error processing CSV file: ${errorMessage}\n\nPlease check the format and try again.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const processAsLeads = async (file: File) => {
    const leads = await parseCSV(file)
    console.log('Parsed leads:', leads.length, 'Sample:', leads[0])
    
    if (leads.length === 0) {
      throw new Error('No valid lead data found in CSV. Please check the file format.')
    }
    
    // Validate leads
    const { valid, invalid } = validateLeads(leads)
    console.log('Validation results - Valid:', valid.length, 'Invalid:', invalid.length)
    
    // Check for existing emails in database - using batching to avoid URL length limits
    const emailsToCheck = valid.map(lead => lead.email.toLowerCase())
    
    if (emailsToCheck.length === 0) {
      setValidationResult({
        valid: [],
        invalid,
        duplicates: []
      })
      setPreviewLeads([])
      return
    }
    
    console.log('Checking', emailsToCheck.length, 'emails for duplicates...')
    
    // Batch emails into smaller chunks to avoid URL length limits
    const batchSize = 50 // Check 50 emails at a time
    const allExistingLeads: any[] = []
    
    for (let i = 0; i < emailsToCheck.length; i += batchSize) {
      const batch = emailsToCheck.slice(i, i + batchSize)
      console.log(`Checking batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emailsToCheck.length / batchSize)} (${batch.length} emails)`)
      
      const { data: batchExistingLeads, error: dbError } = await supabase
        .from('leads')
        .select('email, first_name, last_name')
        .eq('company', selectedCompany) // Filter by company
        .in('email', batch)
      
      if (dbError) {
        console.error('Database error in batch:', dbError)
        throw new Error(`Failed to check for duplicate emails: ${dbError.message}`)
      }
      
      if (batchExistingLeads) {
        allExistingLeads.push(...batchExistingLeads)
      }
    }
    
    console.log('Total existing leads found:', allExistingLeads.length)
    
    // Create duplicate info with existing lead names
    const existingEmailMap = new Map(
      allExistingLeads.map(lead => [
        lead.email?.toLowerCase(), 
        `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
      ])
    )
    
    const duplicates: { email: string; existingLeadName?: string; rowIndex: number; lead: CSVLead }[] = []
    const deduplicated: CSVLead[] = []
    
    // We need to track the original row indices from the full leads array
    const validLeadRowMap = new Map<string, number>()
    leads.forEach((lead, index) => {
      if (lead.email) {
        validLeadRowMap.set(lead.email.toLowerCase(), index + 2) // +2 because CSV rows start at 2 (1 is header)
      }
    })
    
    valid.forEach((lead) => {
      const emailLower = lead.email.toLowerCase()
      if (existingEmailMap.has(emailLower)) {
        duplicates.push({
          email: lead.email,
          existingLeadName: existingEmailMap.get(emailLower),
          rowIndex: validLeadRowMap.get(emailLower) || 0,
          lead
        })
      } else {
        deduplicated.push(lead)
      }
    })
    
    console.log('Deduplication results - Clean:', deduplicated.length, 'Duplicates:', duplicates.length)
    
    setValidationResult({
      valid: deduplicated,
      invalid,
      duplicates
    })
    
    // Set preview leads (first 5)
    setPreviewLeads(deduplicated.slice(0, 5))
    
    // Clear district results
    setDistrictValidationResult(null)
    setPreviewDistricts([])
  }

  const handleImport = async () => {
    if (selectedCompany === 'Avalern' && districtValidationResult) {
      return handleDistrictImport()
    } else if (validationResult) {
      return handleLeadImport()
    }
  }

  const handleDistrictImport = async () => {
    if (!districtValidationResult) return
    
    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/import-districts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          districts: districtValidationResult.valid,
          company: selectedCompany
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      alert(result.message)
      
      // Reset form
      setFile(null)
      setDistrictValidationResult(null)
      setPreviewDistricts([])
      
    } catch (error) {
      console.error('District import error:', error)
      alert(`Failed to import districts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLeadImport = async () => {
    if (!validationResult) return
    
    setIsProcessing(true)
    const importResult: ImportResult = {
      imported: 0,
      failed: 0,
      duplicatesSkipped: validationResult.duplicates.length,
      errors: []
    }
    
    try {
      // Import valid leads to database
      for (const csvLead of validationResult.valid) {
        try {
          // Insert lead with proper status mapping and company
          const leadData = convertToLeadInsert(csvLead)
          
          // Map status to database enum values - default to not_contacted
          let initialStatus = 'not_contacted'
          if (csvLead.response && csvLead.response.trim()) {
            initialStatus = 'engaged'
          } else if (csvLead.callMade === 'Yes' || csvLead.emailSent === 'Yes') {
            initialStatus = 'actively_contacting'
          }
          
          const { data: insertedLead, error: leadError } = await supabase
            .from('leads')
            .insert({
              ...leadData,
              company: selectedCompany,
              status: initialStatus
            })
            .select()
            .single()
          
          if (leadError) {
            importResult.failed++
            importResult.errors.push(`${csvLead.firstName} ${csvLead.lastName}: ${leadError.message}`)
            continue
          }
          
          // Insert initial touchpoint if email was sent or call was made
          if (csvLead.emailSent === 'Yes' || csvLead.callMade === 'Yes') {
            const touchpointData = {
              lead_id: insertedLead.id,
              type: csvLead.emailSent === 'Yes' ? 'email' : 'call',
              subject: csvLead.emailSent === 'Yes' ? 'Initial Email' : 'Initial Call',
              content: csvLead.response || null,
              completed_at: new Date().toISOString(),
              outcome: csvLead.response ? 'responded' : 'no_response'
            }
            
            const { error: touchpointError } = await supabase
              .from('touchpoints')
              .insert(touchpointData)
            
            if (touchpointError) {
              console.warn('Failed to create touchpoint:', touchpointError)
            }
          }
          
          importResult.imported++
        } catch (error) {
          importResult.failed++
          const errorMessage = error instanceof Error ? error.message : String(error)
          importResult.errors.push(`${csvLead.firstName} ${csvLead.lastName}: ${errorMessage}`)
        }
      }
      
      // Show detailed results
      const message = `Import Complete!\n\n` +
        `✅ Successfully imported: ${importResult.imported} leads\n` +
        `⚠️ Duplicates skipped: ${importResult.duplicatesSkipped} leads\n` +
        `❌ Failed imports: ${importResult.failed} leads\n\n` +
        `📋 All leads imported with "Not Contacted" status and can be assigned to campaigns later.\n\n` +
        (importResult.errors.length > 0 ? 
          `Errors:\n${importResult.errors.slice(0, 5).join('\n')}` +
          (importResult.errors.length > 5 ? `\n... and ${importResult.errors.length - 5} more` : '') 
          : '')
      
      alert(message)
      
      // Reset state after successful import
      setFile(null)
      setValidationResult(null)
      setPreviewLeads([])
      
    } catch (error) {
      console.error('Error importing leads:', error)
      alert('Error importing leads. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadSampleCSV = () => {
    // Use the exact format from the existing San Fernando Valley CSV
    const csv = `First Name,Last Name,Email,Online Profile,Phone Number,Linkedin URL,Company,City/State,Website?,Website Link,Email Sent?,Call Made?,Response,Next Step / Notes
Michael,Rodriguez,mrodriguez@kw.com,https://www.zillow.com/profile/mrodriguez,(818) 555-0101,https://www.linkedin.com/in/michaelrodriguez-realty,Keller Williams Realty,"Van Nuys, CA",Yes,https://www.michaelrodriguezrealty.com,Yes,,Interested in website redesign,Schedule demo call for next week
Jennifer,Chen,jchen@remax.com,https://www.realtor.com/realestateagents/jennifer-chen,(818) 555-0102,https://www.linkedin.com/in/jennifer-chen-realtor,RE/MAX Premier Properties,"Sherman Oaks, CA",Yes,https://www.jenniferchenhomes.com,,Yes,,Left voicemail follow up in 3 days
David,Martinez,dmartinez@coldwellbanker.com,https://www.zillow.com/profile/davidmartinez,(818) 555-0103,https://www.linkedin.com/in/david-martinez-realtor,Coldwell Banker Residential,"North Hollywood, CA",No,,,,,New lead - needs website development
Lisa,Thompson,lthompson@century21.com,https://www.realtor.com/realestateagents/lisa-thompson,(818) 555-0104,https://www.linkedin.com/in/lisa-thompson-realty,Century 21 Village Realty,"Burbank, CA",Yes,https://www.lisathompsonhomes.com,Yes,Yes,Not interested at this time,Follow up in 6 months
Robert,Kim,rkim@compass.com,https://www.zillow.com/profile/robertkim,(818) 555-0105,https://www.linkedin.com/in/robert-kim-compass,Compass Real Estate,"Glendale, CA",Yes,https://www.robertkimhomes.com,,,,"High-volume agent, priority prospect"`
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample-san-fernando-valley-leads.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedCompany === 'Avalern' 
                ? 'Import District Leads for Avalern' 
                : 'Import Leads for CraftyCode'
              }
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedCompany === 'Avalern'
                ? 'Upload CSV files to import school district leads for Avalern'
                : 'Upload CSV files to import real estate leads for CraftyCode'
              }
            </p>
          </div>
          <button
            onClick={downloadSampleCSV}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample CSV
          </button>
        </div>

        {/* Upload Section */}
        {!validationResult && !districtValidationResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${isDragging 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedCompany === 'Avalern' 
                  ? 'Upload District CSV File' 
                  : 'Upload Lead CSV File'
                }
                  </h3>
              <p className="text-gray-600 mb-4">
                {selectedCompany === 'Avalern'
                  ? 'Drag and drop your district CSV file here, or click to browse'
                  : 'Drag and drop your lead CSV file here, or click to browse'
                }
              </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                      Choose File
                  </label>
            </div>

            {selectedCompany === 'Avalern' && (
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Expected District CSV Format:</h4>
                <div className="text-sm text-purple-800 space-y-1">
                  <p><strong>Required columns:</strong> School District Name, County, First Name, Last Name, Title, Email Address</p>
                  <p><strong>Optional columns:</strong> Phone Number, Staff Directory Link, Status, Assigned, Notes</p>
                  <p><strong>Multiple contacts per district:</strong> Use separate rows for each contact in the same district</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{validationResult.valid.length}</p>
                  <p className="text-sm text-green-700">Valid Leads</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{validationResult.invalid.length}</p>
                  <p className="text-sm text-red-700">Invalid Leads</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">{validationResult.duplicates.length}</p>
                  <p className="text-sm text-orange-700">Duplicate Emails</p>
                </div>
              </div>
            </div>

            {/* Preview */}
            {previewLeads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview (First 5 Valid Leads)</h3>
                <div className="space-y-4">
                  {previewLeads.map((lead, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {lead.email}
                              </span>
                              {lead.phone && (
                                <span className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {lead.phone}
                                </span>
                          )}
                          {lead.city && (
                                <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {lead.city}
                                </span>
                              )}
                              {lead.company && (
                                <span className="flex items-center">
                                  <Building className="h-3 w-3 mr-1" />
                                  {lead.company}
                                </span>
                              )}
                            </div>
                            </div>
                        </div>
                        {lead.onlineProfile && (
                          <a
                            href={lead.onlineProfile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Profile
                          </a>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-3">
                        <span className={`px-2 py-1 rounded ${lead.emailSent === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          Email: {lead.emailSent || 'No'}
                        </span>
                        <span className={`px-2 py-1 rounded ${lead.callMade === 'Yes' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          Call: {lead.callMade || 'No'}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                          Source: {lead.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setValidationResult(null)
                  setFile(null)
                  setPreviewLeads([])
                }}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Start Over
              </button>
              
              <button
                onClick={handleImport}
                disabled={isProcessing || validationResult.valid.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Importing...' : `Import ${validationResult.valid.length} Real Estate Leads`}
              </button>
            </div>

            {/* Issues */}
            {(validationResult.invalid.length > 0 || validationResult.duplicates.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues Found</h3>
                
                {validationResult.invalid.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-red-800">
                        Invalid Leads ({validationResult.invalid.length})
                      </h4>
                      {validationResult.invalid.length > 5 && (
                        <button
                          onClick={() => setShowAllInvalid(!showAllInvalid)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          {showAllInvalid ? 'Show Less' : 'View All'}
                        </button>
                      )}
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="space-y-2 text-sm text-red-700">
                        {(showAllInvalid ? validationResult.invalid : validationResult.invalid.slice(0, 5)).map((validationError, index) => (
                          <div key={index} className="border-b border-red-200 pb-2 last:border-b-0">
                            <p className="font-medium">
                              Row {validationError.rowIndex}: {validationError.lead.firstName || '[Missing]'} {validationError.lead.lastName || '[Missing]'} - {validationError.lead.email || '[Missing email]'}
                            </p>
                            <ul className="ml-4 mt-1">
                              {validationError.errors.map((error, errorIndex) => (
                                <li key={errorIndex} className="text-xs">• {error}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        {!showAllInvalid && validationResult.invalid.length > 5 && (
                          <p className="text-xs italic">... and {validationResult.invalid.length - 5} more invalid leads</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {validationResult.duplicates.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-800">
                        Duplicate Emails ({validationResult.duplicates.length})
                      </h4>
                      {validationResult.duplicates.length > 5 && (
                        <button
                          onClick={() => setShowAllDuplicates(!showAllDuplicates)}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                        >
                          {showAllDuplicates ? 'Show Less' : 'View All'}
                        </button>
                      )}
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="space-y-2 text-sm text-orange-700">
                        {(showAllDuplicates ? validationResult.duplicates : validationResult.duplicates.slice(0, 5)).map((duplicate, index) => (
                          <div key={index} className="border-b border-orange-200 pb-2 last:border-b-0">
                            <p className="font-medium">
                              Row {duplicate.rowIndex}: {duplicate.lead.firstName} {duplicate.lead.lastName} - {duplicate.email}
                            </p>
                            {duplicate.existingLeadName && (
                              <p className="text-xs text-orange-600 ml-4">
                                Already exists in database as: {duplicate.existingLeadName}
                              </p>
                            )}
                          </div>
                        ))}
                        {!showAllDuplicates && validationResult.duplicates.length > 5 && (
                          <p className="text-xs italic">... and {validationResult.duplicates.length - 5} more duplicates</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* District Validation Results */}
        {districtValidationResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">District Import Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{districtValidationResult.valid.length}</p>
                  <p className="text-sm text-green-700">Valid Districts</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">{districtValidationResult.warnings?.length || 0}</p>
                  <p className="text-sm text-yellow-700">Districts with Warnings</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{districtValidationResult.invalid.length}</p>
                  <p className="text-sm text-red-700">Invalid Districts</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Contacts:</strong> {districtValidationResult.valid.reduce((sum, d) => sum + d.contacts.length, 0)} contacts across {districtValidationResult.valid.length} districts
                </p>
              </div>
            </div>

            {/* Warnings */}
            {districtValidationResult.warnings && districtValidationResult.warnings.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Districts with Contact Issues</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    The following districts will be imported but have some contacts with issues:
                  </p>
                  <div className="space-y-3">
                    {districtValidationResult.warnings.map((item, index) => (
                      <div key={index} className="border-b border-yellow-200 pb-2 last:border-b-0">
                        <p className="font-medium text-yellow-800">{item.district.districtName} ({item.district.county})</p>
                        <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside ml-4">
                          {item.warnings.map((warning, warningIndex) => (
                            <li key={warningIndex}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {previewDistricts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview (First 3 Valid Districts)</h3>
                <div className="space-y-6">
                  {previewDistricts.map((district, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 text-lg">{district.districtName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {district.county}
                            </span>
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {district.contacts.length} contacts
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-800">Contacts:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {district.contacts.map((contact, contactIndex) => (
                            <div key={contactIndex} className="bg-gray-50 rounded p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                                  <p className="text-sm text-gray-600">{contact.title}</p>
                                  <p className="text-sm text-gray-600">{contact.email}</p>
                                  {contact.phone && <p className="text-sm text-gray-600">{contact.phone}</p>}
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  contact.status === 'Valid' ? 'bg-green-100 text-green-800' :
                                  contact.status === 'Not Found' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {contact.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setDistrictValidationResult(null)
                  setFile(null)
                  setPreviewDistricts([])
                }}
                className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Start Over
              </button>
              
              <button
                onClick={handleImport}
                disabled={isProcessing || districtValidationResult.valid.length === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Importing...' : `Import ${districtValidationResult.valid.length} Districts`}
              </button>
            </div>

            {/* Issues */}
            {districtValidationResult.invalid.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues Found</h3>
                
                <div className="mb-6">
                  <h4 className="font-medium text-red-800 mb-2">
                    Invalid Districts ({districtValidationResult.invalid.length})
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-3">
                      {districtValidationResult.invalid.map((item, index) => (
                        <div key={index} className="border-b border-red-200 pb-2 last:border-b-0">
                          <p className="font-medium text-red-800">{item.district.districtName} ({item.district.county})</p>
                          <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                            {item.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 