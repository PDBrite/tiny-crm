'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { STATUS_DISPLAY_MAP } from '../../types/leads'
import { useLeads } from '../../hooks/useLeads'
import { exportToCSV } from '../../lib/csv-utils'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Components
import {
  LeadsHeader,
  SyncResults,
  LeadsFilters,
  LeadsTable,
  LeadDetailPanel
} from '../../components/leads'

export default function LeadsPage() {
  return (
    <Suspense fallback={<DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </DashboardLayout>}>
      <LeadsContent />
    </Suspense>
  )
}

function LeadsContent() {
  const { selectedCompany } = useCompany()
  const searchParams = useSearchParams()
  const districtFilter = searchParams?.get('district')
  const [showFilters, setShowFilters] = useState(true)
  const [filteredDistrictName, setFilteredDistrictName] = useState<string | null>(null)
  
  const {
    // Data
    leads,
    districtContacts,
    allLeads,
    allDistrictContacts,
    filteredLeads,
    filteredDistrictContacts,
    campaigns,
    touchpoints,
    loading,
    syncing,
    syncResults,
    saving,
    
    // Filter states
    searchTerm,
    selectedStage,
    selectedCampaign,
    selectedSource,
    selectedCity,
    
    // Selection states
    selectedLeads,
    selectedLead,
    editingLead,
    
    // Touchpoint states
    showNewTouchpointForm,
    newTouchpoint,
    
    // Pagination states
    currentPage,
    itemsPerPage,
    totalPages,
    totalFilteredCount,
    startIndex,
    endIndex,
    
    // Computed values
    uniqueSources,
    uniqueCities,
    availableStatuses,
    totalCompanyLeads,
    isAvalern,
    
    // Handlers
    setSearchTerm,
    setSelectedStage,
    setSelectedCampaign,
    setSelectedSource,
    setSelectedCity,
    handleSelectLead,
    handleSelectAll,
    handleSelectNumber,
    handlePageChange,
    handleItemsPerPageChange,
    handleOpenLeadPanel,
    handleCloseLeadPanel,
    setEditingLead,
    handleUpdateLead,
    setShowNewTouchpointForm,
    setNewTouchpoint,
    handleAddTouchpoint,
    // handleSyncInstantly,
    setSyncResults,
    
    // Refresh functions
    fetchLeads,
    fetchTouchpoints,
    fetchDistrictContacts,
    fetchDistrictContactTouchpoints
  } = useLeads(selectedCompany, districtFilter)

  // Fetch district name when filtering by district
  useEffect(() => {
    const fetchDistrictName = async () => {
      if (districtFilter && isAvalern) {
        try {
          const { data, error } = await supabase
            .from('district_leads')
            .select('district_name')
            .eq('id', districtFilter)
            .single()
          
          if (error) {
            console.error('Error fetching district name:', error)
            return
          }
          
          setFilteredDistrictName(data?.district_name || null)
        } catch (error) {
          console.error('Error fetching district name:', error)
        }
      } else {
        setFilteredDistrictName(null)
      }
    }
    
    fetchDistrictName()
  }, [districtFilter, isAvalern])

  const handleImportLeads = () => {
    window.location.href = '/import'
  }

  const handleExportLeads = () => {
    if (selectedLeads.length === 0) return
    
    if (isAvalern) {
      // Export district contacts
      const selectedContactObjects = allDistrictContacts.filter(contact => selectedLeads.includes(contact.id))
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `selected-district-contacts-${timestamp}`
      
      // Convert to CSV format for district contacts
      const contactsForExport = selectedContactObjects.map(contact => ({
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || '',
        phone: contact.phone || '', // Convert null to empty string
        city: contact.district_lead?.county || '', // Use county as city for districts
        state: 'CA', // Default to CA
        company: contact.district_lead?.district_name || '', // Use district name as company
        linkedin_url: '', // Not available in DistrictContact
        website_url: '', // Not available in DistrictContact
        online_profile: '', // Not available in DistrictContact
        source: 'District Import',
        status: contact.district_lead?.status || 'not_contacted',
        notes: contact.notes || '',
        campaign_id: contact.district_lead?.campaign_id || undefined,
        last_contacted_at: undefined,
        created_at: contact.created_at,
        updated_at: contact.updated_at || contact.created_at
      }))
      
      exportToCSV(contactsForExport, filename)
    } else {
      // Export individual leads
      const selectedLeadObjects = allLeads.filter(lead => selectedLeads.includes(lead.id))
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `selected-leads-${timestamp}`
      
      // Convert to database Lead type for export
      const leadsForExport = selectedLeadObjects.map(lead => ({
        ...lead,
        source: lead.source || 'Other', // Ensure source is not undefined
        updated_at: lead.created_at // Use created_at as fallback for updated_at
      }))
      
      exportToCSV(leadsForExport, filename)
    }
  }

  const handleToggleFilters = () => {
    setShowFilters(!showFilters)
  }

  const handleToggleTouchpointForm = () => {
    setShowNewTouchpointForm(!showNewTouchpointForm)
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
        {/* District Filter Header */}
        {districtFilter && filteredDistrictName && isAvalern && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <ArrowLeft className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-purple-900">
                    Contacts from {filteredDistrictName}
                  </h2>
                  <p className="text-sm text-purple-700">
                    Showing contacts from this specific district
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Districts
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <LeadsHeader
          onImportLeads={handleImportLeads}
          onExportLeads={handleExportLeads}
          selectedCount={selectedLeads.length}
          totalCompanyLeads={totalCompanyLeads}
          selectedCompany={selectedCompany}
        />

        {/* Sync Results */}
        {/* <SyncResults
          syncResults={syncResults}
          onDismiss={() => setSyncResults(null)}
        /> */}

        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className={`transition-all duration-300 ${selectedLead ? 'w-1/2' : 'w-full'}`}>
            {/* Search and Filters */}
            <LeadsFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              showFilters={showFilters}
              selectedStage={selectedStage}
              onStageChange={setSelectedStage}
              selectedCampaign={selectedCampaign}
              onCampaignChange={setSelectedCampaign}
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              availableStatuses={availableStatuses}
              campaigns={campaigns}
              uniqueSources={uniqueSources}
              uniqueCities={uniqueCities}
              statusDisplayMap={STATUS_DISPLAY_MAP}
              selectedCount={selectedLeads.length}
              totalCount={totalFilteredCount}
              onSelectNumber={handleSelectNumber}
            />

            {/* Leads Table */}
            <LeadsTable
              leads={leads}
              districtContacts={districtContacts}
              selectedLeads={selectedLeads}
              selectedLead={selectedLead}
              isAvalern={isAvalern}
              onSelectLead={handleSelectLead}
              onSelectAll={handleSelectAll}
              onLeadClick={handleOpenLeadPanel}
              onDistrictContactClick={(contact) => {
                // TODO: Implement district contact detail panel
                console.log('District contact clicked:', contact)
              }}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      Showing {startIndex}-{endIndex} of {totalFilteredCount} {isAvalern ? 'contacts' : 'leads'}
                      <span className="text-gray-500 ml-2">(Total: {totalCompanyLeads} {isAvalern ? 'contacts' : 'leads'} for {selectedCompany})</span>
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

          {/* Side Panel */}
          {selectedLead && editingLead && (
            <LeadDetailPanel
              selectedLead={selectedLead}
              editingLead={editingLead}
              onEditingLeadChange={setEditingLead}
              onClose={handleCloseLeadPanel}
              onSave={handleUpdateLead}
              saving={saving}
              campaigns={campaigns}
              availableStatuses={availableStatuses}
              touchpoints={touchpoints}
              showNewTouchpointForm={showNewTouchpointForm}
              onToggleTouchpointForm={handleToggleTouchpointForm}
              newTouchpoint={newTouchpoint}
              onNewTouchpointChange={setNewTouchpoint}
              onAddTouchpoint={handleAddTouchpoint}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 