'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import { useCompany } from '../../../contexts/CompanyContext'
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
  return (
    <Suspense fallback={<DashboardLayout><div className="p-4">Loading...</div></DashboardLayout>}>
      <SelectDistrictsContent />
    </Suspense>
  )
}

function SelectDistrictsContent() {
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

  // Apply filters
  useEffect(() => {
    const fetchFilteredDistricts = async () => {
      try {
        setLoading(true)
        
        // Build query parameters for API
        const params = new URLSearchParams()
        
        if (searchTerm) {
          params.append('search', searchTerm)
        }
        
        if (selectedStatus) {
          params.append('status', selectedStatus)
        }
        
        if (selectedCounty) {
          params.append('county', selectedCounty)
        }
        
        // Use the API endpoint with filters
        const response = await fetch(`/api/campaign-districts?${params.toString()}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Error fetching filtered districts from API:', response.status, errorData)
          return
        }
        
        const data = await response.json()
        
        // Set districts and filtered districts from API response
        setDistricts(data.districts || [])
        setFilteredDistricts(data.districts || [])
        
        // Reset to first page when filters change
        setCurrentPage(1)
        
      } catch (error) {
        console.error('Error fetching filtered districts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (selectedCompany === 'Avalern') {
      fetchFilteredDistricts()
    }
  }, [selectedCompany, searchTerm, selectedStatus, selectedCounty])

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
      console.log(`Creating campaign "${campaignName}" with ${selectedDistricts.length} districts`);
      
      // Create campaign using API endpoint instead of direct Supabase access
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignName,
          company: selectedCompany,
          description: description,
          startDate: launchDate,
          endDate: endDate,
          outreachSequenceId: outreachSequenceId,
          instantlyCampaignId: instantlyCampaignId || null
        })
      });

      if (!campaignResponse.ok) {
        const errorData = await campaignResponse.json();
        console.error('Error creating campaign:', errorData);
        alert(`Failed to create campaign: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const campaignResult = await campaignResponse.json();
      const campaign = campaignResult.campaign;
      
      console.log(`Campaign created successfully with ID: ${campaign.id}`);
      
      // Assign selected districts to the campaign using the API endpoint
      console.log(`Assigning ${selectedDistricts.length} districts to campaign ${campaign.id}`);
      const assignResponse = await fetch('/api/assign-districts-to-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          district_ids: selectedDistricts
        })
      });

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        console.error('Error assigning districts to campaign:', errorData);
        alert(`Campaign created but failed to assign districts: ${errorData.details || errorData.error}`);
        return;
      }

      const assignResult = await assignResponse.json();
      console.log('District assignment result:', assignResult);

      // Get all district contacts from selected districts using API
      console.log(`Fetching district contacts for ${selectedDistricts.length} districts`);
      const contactsResponse = await fetch(`/api/district-contacts?district_ids=${selectedDistricts.join(',')}&status=Valid`);
      
      if (!contactsResponse.ok) {
        const errorData = await contactsResponse.json();
        console.error('Error fetching district contacts:', errorData);
        alert('Campaign created but failed to fetch district contacts');
        return;
      }
      
      const contactsData = await contactsResponse.json();
      const districtContacts = contactsData.contacts || [];
      
      console.log(`Found ${districtContacts.length} district contacts`);
      
      // Get outreach sequence details
      const sequenceResponse = await fetch(`/api/outreach-sequences/${outreachSequenceId}`);
      if (!sequenceResponse.ok) {
        console.error('Error fetching outreach sequence details');
        alert('Campaign created but failed to fetch outreach sequence details');
        return;
      }
      
      const sequenceData = await sequenceResponse.json();
      const outreachSequence = sequenceData.sequence;
      
      // Schedule touchpoints for all district contacts
      if (districtContacts.length > 0 && outreachSequence?.steps?.length > 0) {
        const campaignStartDate = new Date(launchDate);
        const outreachSteps = outreachSequence.steps;
        
        console.log(`Using ${outreachSteps.length} outreach steps for scheduling touchpoints`);
        const touchpointsToCreate = [];
        
        for (const contact of districtContacts) {
          const scheduledTouchpoints = scheduleTouchpointsForLead(
            { districtContactId: contact.id },
            campaignStartDate,
            outreachSteps,
            {
              first_name: contact.first_name || contact.firstName,
              last_name: contact.last_name || contact.lastName,
              company: '', // Will be populated from district
              city: '' // Will be populated from district
            }
          );
          
          // Filter touchpoints based on available contact methods
          const filteredTouchpoints = scheduledTouchpoints.filter(tp => {
            // Only schedule email touchpoints if contact has email
            if (tp.type === 'email') {
              return contact.email && contact.email.trim().length > 0;
            }
            // Only schedule call touchpoints if contact has phone
            if (tp.type === 'call') {
              return contact.phone && contact.phone.trim().length > 0;
            }
            // LinkedIn messages don't require email or phone
            if (tp.type === 'linkedin_message') {
              return true;
            }
            return true;
          });
          
          touchpointsToCreate.push(...filteredTouchpoints);
        }

        if (touchpointsToCreate.length > 0) {
          console.log(`Creating ${touchpointsToCreate.length} touchpoints for ${districtContacts.length} contacts`);
          console.log('Sample touchpoint (full data):', JSON.stringify(touchpointsToCreate[0], null, 2));
          console.log('All touchpoint types:', touchpointsToCreate.map(tp => tp.type));
          
          // Create touchpoints in smaller batches to avoid timeouts
          const BATCH_SIZE = 50;
          let successCount = 0;
          
          for (let i = 0; i < touchpointsToCreate.length; i += BATCH_SIZE) {
            const batch = touchpointsToCreate.slice(i, i + BATCH_SIZE);
            
            try {
              // Create touchpoints using the API endpoint
              const response = await fetch('/api/touchpoints/batch', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ touchpoints: batch }),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error(`Error creating touchpoints batch ${i/BATCH_SIZE + 1}:`, errorData);
              } else {
                const result = await response.json();
                successCount += result.count || 0;
                console.log(`Successfully created batch ${i/BATCH_SIZE + 1} with ${result.count} touchpoints`);
              }
            } catch (batchError) {
              console.error(`Error processing batch ${i/BATCH_SIZE + 1}:`, batchError);
            }
          }
          
          if (successCount < touchpointsToCreate.length) {
            alert(`Campaign created and districts assigned, but only ${successCount} of ${touchpointsToCreate.length} touchpoints were scheduled. Check console for details.`);
          } else {
            console.log(`Successfully created ${successCount} touchpoints`);
          }
        } else {
          console.log('No touchpoints to create - all contacts may be missing required contact information');
        }
      }

      alert(`Campaign "${campaignName}" created successfully with ${selectedDistricts.length} districts and ${districtContacts.length} contacts!`);
      router.push(`/campaigns/${campaign.id}`);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setCreating(false);
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
                      className={`hover:bg-gray-50 ${selectedDistricts.includes(district.id) ? 'bg-purple-50' : ''} cursor-pointer`}
                      onClick={() => handleSelectDistrict(district.id)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDistricts.includes(district.id)}
                          onChange={(e) => {
                            // Stop propagation to prevent double-toggle when clicking directly on checkbox
                            e.stopPropagation();
                            handleSelectDistrict(district.id);
                          }}
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