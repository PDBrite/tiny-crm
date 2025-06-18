'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import { useCompany } from '../../../contexts/CompanyContext'
import { supabase } from '../../../lib/supabase'
import { DistrictLead, DISTRICT_STATUS_DISPLAY_MAP } from '../../../types/districts'
import { OutreachStep } from '../../../types/leads'
import { scheduleTouchpointsForLead } from '../../../utils/outreach-scheduler'
import {
  Search,
  Users,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building,
  Filter,
  X,
  Calendar,
  Target
} from 'lucide-react'

export default function SelectDistrictsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompany, isLoading: companyLoading } = useCompany()
  
  // Get campaign data from URL params
  const campaignName = searchParams.get('campaignName') || ''
  const outreachSequenceId = searchParams.get('outreachSequenceId') || ''
  const launchDate = searchParams.get('launchDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const description = searchParams.get('description') || ''
  const instantlyCampaignId = searchParams.get('instantlyCampaignId') || ''

  // State
  const [districts, setDistricts] = useState<DistrictLead[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<DistrictLead[]>([])
  const [paginatedDistricts, setPaginatedDistricts] = useState<DistrictLead[]>([])
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedCounty, setSelectedCounty] = useState('')

  // Computed values
  const uniqueCounties = [...new Set((districts || []).map(d => d.county).filter(Boolean))].sort()
  const availableStatuses = Object.keys(DISTRICT_STATUS_DISPLAY_MAP)

  // Pagination info
  const totalPages = Math.ceil(filteredDistricts.length / itemsPerPage)
  const totalFilteredCount = filteredDistricts.length
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, filteredDistricts.length)

  // Redirect if not Avalern - but wait for context to load first
  useEffect(() => {
    if (!companyLoading && selectedCompany !== 'Avalern') {
      router.push('/campaigns/select-leads')
    }
  }, [selectedCompany, companyLoading, router])

  // Fetch available districts
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('district_leads')
          .select(`
            *,
            district_contacts(id, first_name, last_name, title, email, status),
            campaign:campaigns(id, name)
          `)
          .eq('company', selectedCompany)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching districts:', error)
          return
        }

        // Enrich with computed fields
        const enriched = data.map(district => ({
          ...district,
          contacts_count: district.district_contacts?.length || 0,
          valid_contacts_count: district.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0,
          touchpoints_count: 0
        }))

        setDistricts(enriched)
      } catch (error) {
        console.error('Error fetching districts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (selectedCompany === 'Avalern') {
      fetchDistricts()
    }
  }, [selectedCompany])

  // Apply filters
  useEffect(() => {
    let filtered = districts || []

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(district => 
        (district.district_name || '').toLowerCase().includes(searchLower) ||
        (district.county || '').toLowerCase().includes(searchLower)
      )
    }

    if (selectedStatus) {
      filtered = filtered.filter(district => district.status === selectedStatus)
    }

    if (selectedCounty) {
      filtered = filtered.filter(district => district.county === selectedCounty)
    }

    setFilteredDistricts(filtered)
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [districts, searchTerm, selectedStatus, selectedCounty])

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredDistricts.slice(startIndex, endIndex)
    setPaginatedDistricts(paginated)
  }, [filteredDistricts, currentPage, itemsPerPage])

  // Selection handlers
  const handleSelectDistrict = (districtId: string) => {
    setSelectedDistricts(prev => 
      prev.includes(districtId)
        ? prev.filter(id => id !== districtId)
        : [...prev, districtId]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredDistricts.map(district => district.id)
    setSelectedDistricts(prev => 
      prev.length === allFilteredIds.length 
        ? [] 
        : allFilteredIds
    )
  }

  const handleClearSelection = () => {
    setSelectedDistricts([])
  }

  const handleSelectNumber = (count: number) => {
    if (count === 0) {
      setSelectedDistricts([])
    } else {
      const districtsToSelect = filteredDistricts.slice(0, count)
      setSelectedDistricts(districtsToSelect.map(district => district.id))
    }
  }

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1) // Reset to first page
  }

  // Create campaign with selected districts
  const handleCreateCampaign = async () => {
    if (selectedDistricts.length === 0) {
      alert('Please select at least one district for this campaign')
      return
    }

    setCreating(true)
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaignName,
          company: selectedCompany,
          description: description,
          start_date: launchDate,
          end_date: endDate,
          outreach_sequence_id: outreachSequenceId,
          instantly_campaign_id: instantlyCampaignId || null,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          outreach_sequence:outreach_sequences(
            id, name, description,
            steps:outreach_steps(*)
          )
        `)
        .single()

      if (campaignError) {
        console.error('Error creating campaign:', campaignError)
        alert('Failed to create campaign')
        return
      }

      // Assign selected districts to the campaign and update status to actively_contacting
      const { error: districtsError } = await supabase
        .from('district_leads')
        .update({ 
          campaign_id: campaign.id,
          status: 'actively_contacting'
        })
        .in('id', selectedDistricts)

      if (districtsError) {
        console.error('Error assigning districts to campaign:', districtsError)
        alert('Campaign created but failed to assign districts')
        return
      }

      // Get all district contacts from selected districts
      const { data: districtContacts, error: contactsError } = await supabase
        .from('district_contacts')
        .select('*')
        .in('district_lead_id', selectedDistricts)
        .eq('status', 'Valid') // Only schedule touchpoints for valid contacts

      console.log('Fetched district contacts:', districtContacts?.length || 0)
      console.log('Sample district contact:', districtContacts?.[0])

      if (contactsError) {
        console.error('Error fetching district contacts:', contactsError)
        alert('Campaign created but failed to fetch district contacts')
        return
      }

      // Schedule touchpoints for all district contacts
      console.log('Campaign outreach sequence:', campaign.outreach_sequence)
      console.log('Outreach sequence steps:', campaign.outreach_sequence?.steps)
      
      if (districtContacts && districtContacts.length > 0 && campaign.outreach_sequence?.steps) {
        const campaignStartDate = new Date(launchDate)
        const dbSteps = campaign.outreach_sequence.steps as any[]
        
        // Map database steps to OutreachStep interface
        const outreachSteps: OutreachStep[] = dbSteps.map(step => ({
          id: step.id,
          sequence_id: step.outreach_sequence_id,
          step_order: step.step_number,
          type: step.type,
          name: step.name,
          content_link: step.content_link,
          day_offset: step.day_offset,
          created_at: step.created_at,
          updated_at: step.updated_at
        }))
        
        const touchpointsToCreate = []
        
        for (const contact of districtContacts) {
          const scheduledTouchpoints = scheduleTouchpointsForLead(
            '', // No lead_id for district contacts
            campaignStartDate,
            outreachSteps,
            {
              first_name: contact.first_name,
              last_name: contact.last_name,
              company: '', // Will be populated from district
              city: '' // Will be populated from district
            }
          )
          
          // Filter touchpoints based on available contact methods
          const filteredTouchpoints = scheduledTouchpoints.filter(tp => {
            // Only schedule email touchpoints if contact has email
            if (tp.type === 'email') {
              return contact.email && contact.email.trim().length > 0
            }
            // Only schedule call touchpoints if contact has phone
            if (tp.type === 'call') {
              return contact.phone && contact.phone.trim().length > 0
            }
            // LinkedIn messages don't require email or phone
            if (tp.type === 'linkedin_message') {
              return true
            }
            return true
          })
          
          // Convert to district contact touchpoints (remove lead_id and add district_contact_id)
          const districtTouchpoints = filteredTouchpoints.map(tp => ({
            lead_id: null, // Explicitly set to null for district contacts
            district_contact_id: contact.id,
            type: tp.type,
            subject: tp.subject,
            content: tp.content,
            scheduled_at: tp.scheduled_at
          }))
          
          touchpointsToCreate.push(...districtTouchpoints)
        }

        if (touchpointsToCreate.length > 0) {
          console.log(`Creating ${touchpointsToCreate.length} touchpoints for ${districtContacts?.length || 0} contacts`)
          console.log('Sample touchpoint (full data):', JSON.stringify(touchpointsToCreate[0], null, 2))
          console.log('All touchpoint types:', touchpointsToCreate.map(tp => tp.type))
          
          const { data: insertedTouchpoints, error: touchpointsError } = await supabase
            .from('touchpoints')
            .insert(touchpointsToCreate)
            .select()

          if (touchpointsError) {
            console.error('Error creating touchpoints:', touchpointsError)
            console.error('Error details:', JSON.stringify(touchpointsError, null, 2))
            console.error('Failed touchpoints data (first 3):', JSON.stringify(touchpointsToCreate.slice(0, 3), null, 2))
            alert('Campaign created and districts assigned, but failed to schedule some touchpoints. Check console for details.')
          } else {
            console.log(`Successfully created ${insertedTouchpoints?.length || 0} touchpoints`)
          }
        } else {
          console.log('No touchpoints to create - all contacts may be missing required contact information')
        }
      }

      alert(`Campaign "${campaignName}" created successfully with ${selectedDistricts.length} districts and ${districtContacts?.length || 0} contacts!`)
      router.push('/campaigns')
      
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'not_contacted': 'bg-gray-100 text-gray-800',
      'actively_contacting': 'bg-blue-100 text-blue-800',
      'engaged': 'bg-green-100 text-green-800',
      'won': 'bg-emerald-100 text-emerald-800',
      'not_interested': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors['not_contacted']
  }

  // Calculate total contacts from selected districts
  const totalSelectedContacts = selectedDistricts.reduce((total, districtId) => {
    const district = districts.find(d => d.id === districtId)
    return total + (district?.valid_contacts_count || 0)
  }, 0)

  // Show loading while company context is still loading
  if (companyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading company context...</span>
        </div>
      </DashboardLayout>
    )
  }

  // Only check company after context is loaded
  if (selectedCompany !== 'Avalern') {
    return null // Will redirect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading districts...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Select Districts</h1>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Campaign: {campaignName}</h3>
            <p className="text-blue-700 text-sm">
              Select the school districts you want to include in this campaign. 
              Touchpoints will be scheduled for all valid contacts within the selected districts.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filter Districts</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Search districts..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {DISTRICT_STATUS_DISPLAY_MAP[status as keyof typeof DISTRICT_STATUS_DISPLAY_MAP]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Counties</option>
                {uniqueCounties.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedStatus('')
                  setSelectedCounty('')
                }}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">
                  {selectedDistricts.length} districts selected
                </span>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">
                  {totalSelectedContacts} contacts will receive touchpoints
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                onChange={(e) => handleSelectNumber(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Quick Select</option>
                <option value="0">Clear All</option>
                <option value="5">First 5</option>
                <option value="10">First 10</option>
                <option value="20">First 20</option>
              </select>

              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                {selectedDistricts.length === filteredDistricts.length ? 'Deselect All' : 'Select All'}
              </button>

              {selectedDistricts.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Clear Selection
                </button>
              )}

              {selectedDistricts.length > 0 && (
                <button
                  onClick={handleCreateCampaign}
                  disabled={creating}
                  className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Districts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    District
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Campaign
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Building className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No districts found</h3>
                        <p className="text-gray-500 mb-4">
                          No districts match your current filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDistricts.map((district) => (
                    <tr 
                      key={district.id}
                      className={`hover:bg-gray-50 ${selectedDistricts.includes(district.id) ? 'bg-purple-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDistricts.includes(district.id)}
                          onChange={() => handleSelectDistrict(district.id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {district.district_name}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {district.county}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(district.status)}`}>
                          {DISTRICT_STATUS_DISPLAY_MAP[district.status as keyof typeof DISTRICT_STATUS_DISPLAY_MAP]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            {district.valid_contacts_count} valid
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {district.contacts_count} total contacts
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {district.campaign ? (
                          <div className="flex items-center text-sm text-blue-600">
                            <Calendar className="h-4 w-4 mr-1" />
                            {district.campaign.name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <span>Showing {startIndex} to {endIndex} of {totalFilteredCount} districts</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                    className="ml-4 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      if (pageNumber > totalPages) return null
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-2 text-sm rounded-md ${
                            currentPage === pageNumber
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 