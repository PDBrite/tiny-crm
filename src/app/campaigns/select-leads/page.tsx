'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import { useCompany } from '../../../contexts/CompanyContext'
import { STATUS_DISPLAY_MAP } from '../../../types/leads'
import {
  Search,
  Users,
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  city?: string
  status: string
  campaignId?: string
  createdAt: string
  source?: string
}

export default function SelectLeadsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <SelectLeadsContent />
    </Suspense>
  )
}

function SelectLeadsContent() {
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
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [paginatedLeads, setPaginatedLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedSource, setSelectedSource] = useState('')

  // Computed values
  const uniqueCities = useMemo(() => 
    [...new Set((leads || []).map(l => l.city).filter(Boolean))].sort(),
    [leads]
  )
  
  const uniqueSources = useMemo(() => 
    [...new Set((leads || []).map(l => l.source).filter(Boolean))].sort(),
    [leads]
  )
  
  const availableStatuses = Object.keys(STATUS_DISPLAY_MAP)

  // Pagination info
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const totalFilteredCount = filteredLeads.length
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, filteredLeads.length)

  // Redirect if Avalern user lands here by mistake
  useEffect(() => {
    if (!companyLoading && selectedCompany === 'Avalern') {
      const params = new URLSearchParams(searchParams.toString())
      router.replace(`/campaigns/select-districts?${params.toString()}`)
    }
  }, [selectedCompany, companyLoading, router, searchParams])

  // Fetch available leads
  useEffect(() => {
    const fetchLeads = async () => {
      // Skip fetching if we're going to redirect anyway
      if (!companyLoading && selectedCompany === 'Avalern') {
        return;
      }
      
      try {
        setLoading(true)
        
        const response = await fetch('/api/leads?unassigned=true');
        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }
        
        const data = await response.json();
        setLeads(data || []);
      } catch (error) {
        console.error('Error fetching leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [selectedCompany, companyLoading])

  // Apply filters
  useEffect(() => {
    let filtered = leads || []

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(lead => 
        (lead.firstName || '').toLowerCase().includes(searchLower) ||
        (lead.lastName || '').toLowerCase().includes(searchLower) ||
        (lead.email || '').toLowerCase().includes(searchLower)
      )
    }

    if (selectedStatus) {
      filtered = filtered.filter(lead => lead.status === selectedStatus)
    }

    if (selectedCity) {
      filtered = filtered.filter(lead => lead.city === selectedCity)
    }

    if (selectedSource) {
      filtered = filtered.filter(lead => lead.source === selectedSource)
    }

    setFilteredLeads(filtered)
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [leads, searchTerm, selectedStatus, selectedCity, selectedSource])

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filteredLeads.slice(startIndex, endIndex)
    setPaginatedLeads(paginated)
  }, [filteredLeads, currentPage, itemsPerPage])

  // Selection handlers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredLeads.map(lead => lead.id)
    setSelectedLeads(prev => 
      prev.length === allFilteredIds.length 
        ? [] 
        : allFilteredIds
    )
  }

  const handleClearSelection = () => {
    setSelectedLeads([])
  }

  const handleSelectNumber = (count: number) => {
    if (count === 0) {
      setSelectedLeads([])
    } else {
      const leadsToSelect = filteredLeads.slice(0, count)
      setSelectedLeads(leadsToSelect.map(lead => lead.id))
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

  // Create campaign with selected leads
  const handleCreateCampaign = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead for this campaign')
      return
    }

    setCreating(true)
    try {
      // Create campaign via API
      const response = await fetch('/api/campaigns/create-with-leads', {
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
          instantlyCampaignId: instantlyCampaignId || null,
          leadIds: selectedLeads
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
      
      const result = await response.json();
      const campaign = result.campaign;

      // Schedule touchpoints for all selected leads
      if (campaign.outreachSequence?.steps) {
        const touchpointsToCreate = []
        const launchDateObj = new Date(launchDate)

        // Helper function to add business days
        const addBusinessDays = (date: Date, days: number) => {
          const result = new Date(date)
          let addedDays = 0
          while (addedDays < days) {
            result.setDate(result.getDate() + 1)
            if (result.getDay() !== 0 && result.getDay() !== 6) { // Skip weekends
              addedDays++
            }
          }
          return result
        }

        for (const leadId of selectedLeads) {
          for (const step of campaign.outreachSequence.steps) {
            const scheduledDate = addBusinessDays(launchDateObj, step.dayOffset)
            
            console.log('Creating touchpoint for step:', {
              stepType: step.type,
              stepName: step.name,
              stepContentLink: step.contentLink,
              dayOffset: step.dayOffset
            })
            
            touchpointsToCreate.push({
              lead_id: leadId,
              type: step.type,
              subject: step.name || '',
              content: step.contentLink || '',
              scheduled_at: scheduledDate.toISOString()
            })
          }
        }

        // Use the API endpoint instead of direct Supabase access
        console.log(`Creating ${touchpointsToCreate.length} touchpoints via API`)
        console.log('Sample touchpoint data:', JSON.stringify(touchpointsToCreate[0], null, 2))
        
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
              throw new Error(`Touchpoint batch ${i/BATCH_SIZE + 1} failed: ${errorData.error || 'Unknown error'}`);
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
          alert(`Campaign and leads created but only ${successCount} of ${touchpointsToCreate.length} touchpoints were scheduled. Check console for details.`);
        }
      }

      const touchpointCount = selectedLeads.length * (campaign.outreachSequence?.steps?.length || 0)
      alert(`Campaign "${campaign.name}" created successfully!\n${selectedLeads.length} leads assigned and ${touchpointCount} touchpoints scheduled.`)
      
      // Navigate to the campaign detail page
      router.push(`/campaigns/${campaign.id}`)

    } catch (error) {
      console.error('Error creating campaign:', error)
      alert(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    return colors[status as keyof typeof colors] || colors.not_contacted
  }

  // Don't render anything if we're redirecting
  if (companyLoading || selectedCompany === 'Avalern') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Select Leads for Campaign</h1>
                  <p className="text-gray-600 mt-1">
                    Choose leads for "<span className="font-semibold text-blue-600">{campaignName}</span>" campaign
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Campaign Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <h3 className="text-lg font-bold text-blue-900">Campaign Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Campaign Name</p>
              <p className="text-lg font-semibold text-gray-900">{campaignName}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Launch Date</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(launchDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Company</p>
              <p className="text-lg font-semibold text-gray-900">{selectedCompany}</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Leads</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Bulk Selection Controls */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Bulk Selection</h4>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Select:</label>
                  <input
                    id="selectCount"
                    type="number"
                    min="1"
                    max={totalFilteredCount}
                    defaultValue={50}
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">leads</span>
                </div>
                <button
                  onClick={() => {
                    const input = document.getElementById('selectCount') as HTMLInputElement
                    const count = parseInt(input.value) || 50
                    if (count > 0 && count <= totalFilteredCount) {
                      handleSelectNumber(count)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Select
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Filter Leads</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    {availableStatuses.map(status => (
                      <option key={status} value={status}>
                        {STATUS_DISPLAY_MAP[status as keyof typeof STATUS_DISPLAY_MAP]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Cities</option>
                    {uniqueCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Sources</option>
                    {uniqueSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar - Show when leads are selected */}
        {selectedLeads.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedLeads.length} leads selected
                  </p>
                  <p className="text-sm text-gray-600">
                    Ready to create campaign with selected leads
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={creating || selectedLeads.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center text-lg"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Campaign...
                    </>
                  ) : (
                    <>
                      Create Campaign
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(paginatedLeads || []).map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedLeads.includes(lead.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectLead(lead.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          // Stop propagation to prevent double-toggle when clicking directly on checkbox
                          e.stopPropagation();
                          handleSelectLead(lead.id);
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {STATUS_DISPLAY_MAP[lead.status as keyof typeof STATUS_DISPLAY_MAP]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-500">
                No leads match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Showing {startIndex}-{endIndex} of {totalFilteredCount} leads
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                    if (pageNum > totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
