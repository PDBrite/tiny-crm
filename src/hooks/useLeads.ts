'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../lib/supabase'
import { Lead, Campaign, Touchpoint, SyncResults, STATUS_DISPLAY_MAP } from '../types/leads'
import { DistrictContact } from '../types/districts'
import { useCompany } from '../contexts/CompanyContext'

export function useLeads(selectedCompany: string, districtFilter?: string | null) {
  const supabase = createClientComponentClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [districtContacts, setDistrictContacts] = useState<DistrictContact[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [filteredDistrictContacts, setFilteredDistrictContacts] = useState<DistrictContact[]>([])
  const [paginatedLeads, setPaginatedLeads] = useState<Lead[]>([])
  const [paginatedDistrictContacts, setPaginatedDistrictContacts] = useState<DistrictContact[]>([])
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')

  // Selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Touchpoint states
  const [showNewTouchpointForm, setShowNewTouchpointForm] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState<Partial<Touchpoint>>({
    type: 'email',
    completed_at: new Date().toISOString().slice(0, 16)
  })
  const [saving, setSaving] = useState(false)

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      // Skip if no company selected yet
      if (!selectedCompany) {
        console.log('No company selected yet, skipping campaign fetch')
        return
      }
      
      console.log('Fetching campaigns for company:', selectedCompany)
      
      // Use the API endpoint instead of direct supabase access
      const response = await fetch(`/api/campaigns?company=${selectedCompany}`)
      
      if (!response.ok) {
        console.error('Error fetching campaigns from API:', response.status)
        return
      }
      
      const campaignsData = await response.json()
      console.log('Fetched campaigns:', campaignsData.length)
      
      setCampaigns(campaignsData || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true)
      
      // First fetch leads with campaigns
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          campaign:campaigns(id, name, company)
        `)
        .eq('company', selectedCompany)
        .order('created_at', { ascending: false })

      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        return
      }

      // Then fetch contact attempts count for each lead (only completed touchpoints with outcomes)
      const leadsWithCounts = await Promise.all(
        (leadsData || []).map(async (lead) => {
          // Get completed touchpoints count
          const { count: completedCount } = await supabase
            .from('touchpoints')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead.id)
            .not('completed_at', 'is', null)
            .not('outcome', 'is', null)
          
          // Get scheduled touchpoints count (not completed yet)
          const { count: scheduledCount } = await supabase
            .from('touchpoints')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead.id)
            .is('completed_at', null)
            .not('scheduled_at', 'is', null)
          
          return {
            ...lead,
            touchpoints_count: completedCount || 0,
            scheduled_touchpoints_count: scheduledCount || 0
          }
        })
      )

      setLeads(leadsWithCounts)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch touchpoints for a specific lead (only completed touchpoints with outcomes)
  const fetchTouchpoints = async (leadId: string) => {
    try {
      const { data: touchpointsData, error } = await supabase
        .from('touchpoints')
        .select('*')
        .eq('lead_id', leadId)
        .not('completed_at', 'is', null)
        .not('outcome', 'is', null)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error fetching touchpoints:', error)
        return
      }

      setTouchpoints(touchpointsData || [])
    } catch (error) {
      console.error('Error fetching touchpoints:', error)
    }
  }

  // Fetch district contacts for Avalern
  const fetchDistrictContacts = async () => {
    try {
      setLoading(true)
      console.log('Fetching district contacts for company:', selectedCompany)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (districtFilter) {
        params.append('district_id', districtFilter)
      }
      
      // Use the API endpoint instead of direct supabase access
      const response = await fetch(`/api/district-contacts?${params.toString()}`)
      
      if (!response.ok) {
        console.error('Error fetching district contacts from API:', response.status)
        return
      }
      
      const data = await response.json()
      console.log('Fetched district contacts:', data.contacts?.length || 0)
      
      // The contacts are already enriched with touchpoint counts from the API
      setDistrictContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching district contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch touchpoints for a specific district contact
  const fetchDistrictContactTouchpoints = async (contactId: string) => {
    try {
      const { data: touchpointsData, error } = await supabase
        .from('touchpoints')
        .select('*')
        .eq('district_contact_id', contactId)
        .not('completed_at', 'is', null)
        .not('outcome', 'is', null)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error fetching district contact touchpoints:', error)
        return
      }

      setTouchpoints(touchpointsData || [])
    } catch (error) {
      console.error('Error fetching district contact touchpoints:', error)
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (selectedCompany === 'Avalern') {
      fetchDistrictContacts()
    } else {
    fetchLeads()
    }
    fetchCampaigns()
  }, [selectedCompany, districtFilter])

  // Auto-select leads when they first load
  useEffect(() => {
    if (leads.length > 0 && selectedLeads.length === 0) {
      // Don't auto-select any leads - let user choose
    }
  }, [leads.length, selectedLeads.length])

  // Filter leads based on search and filters
  useEffect(() => {
    if (selectedCompany === 'Avalern') {
      // Filter district contacts
      let filtered = districtContacts || []

      // Search filter
      if (searchTerm) {
        filtered = filtered.filter(contact =>
          `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contact.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contact.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contact.district_lead?.district_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (contact.district_lead?.county || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Stage filter (based on district status)
      if (selectedStage !== 'all') {
        filtered = filtered.filter(contact => contact.district_lead?.status === selectedStage)
      }

      // Campaign filter (based on district campaign)
      if (selectedCampaign !== 'all') {
        filtered = filtered.filter(contact => contact.district_lead?.campaign_id === selectedCampaign)
      }

      // City filter (based on county for districts)
      if (selectedCity !== 'all') {
        filtered = filtered.filter(contact => contact.district_lead?.county === selectedCity)
      }

      setFilteredDistrictContacts(filtered)
    } else {
      // Filter individual leads
      let filtered = leads || []

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
          `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Stage filter
    if (selectedStage !== 'all') {
      filtered = filtered.filter(lead => lead.status === selectedStage)
    }

    // Campaign filter
    if (selectedCampaign !== 'all') {
      filtered = filtered.filter(lead => lead.campaign_id === selectedCampaign)
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(lead => lead.source === selectedSource)
    }

    // City filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter(lead => lead.city === selectedCity)
    }

    setFilteredLeads(filtered)
    }
    
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [leads, districtContacts, searchTerm, selectedStage, selectedCampaign, selectedSource, selectedCity, selectedCompany])

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    
    if (selectedCompany === 'Avalern') {
      const paginated = filteredDistrictContacts.slice(startIndex, endIndex)
      setPaginatedDistrictContacts(paginated)
    } else {
      const paginated = filteredLeads.slice(startIndex, endIndex)
      setPaginatedLeads(paginated)
    }
  }, [filteredLeads, filteredDistrictContacts, currentPage, itemsPerPage, selectedCompany])

  // Lead selection handlers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    }
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

  // Lead panel handlers
  const handleOpenLeadPanel = async (lead: Lead) => {
    setSelectedLead(lead)
    setEditingLead({ ...lead })
    await fetchTouchpoints(lead.id)
  }

  const handleCloseLeadPanel = () => {
    setSelectedLead(null)
    setEditingLead(null)
    setTouchpoints([])
    setShowNewTouchpointForm(false)
    setNewTouchpoint({
      type: 'email',
      completed_at: new Date().toISOString().slice(0, 16)
    })
  }

  // Update lead
  const handleUpdateLead = async () => {
    if (!editingLead || !selectedLead) return

    try {
      setSaving(true)
      
      // Check if lead is being assigned to a campaign and should change status
      let finalStatus = editingLead.status
      const wasAssignedToCampaign = !selectedLead.campaign_id && editingLead.campaign_id
      const isBeingRemovedFromCampaign = selectedLead.campaign_id && !editingLead.campaign_id
      
      if (wasAssignedToCampaign && editingLead.status === 'not_contacted') {
        // Auto-change status to actively_contacting when assigning to campaign
        finalStatus = 'actively_contacting'
      } else if (isBeingRemovedFromCampaign && editingLead.status === 'actively_contacting') {
        // Auto-change status back to not_contacted when removing from campaign
        finalStatus = 'not_contacted'
      }
      
      const { error } = await supabase
        .from('leads')
        .update({
          first_name: editingLead.first_name,
          last_name: editingLead.last_name,
          email: editingLead.email,
          phone: editingLead.phone,
          city: editingLead.city,
          state: editingLead.state,
          company: editingLead.company,
          linkedin_url: editingLead.linkedin_url,
          website_url: editingLead.website_url,
          online_profile: editingLead.online_profile,
          source: editingLead.source,
          status: finalStatus,
          notes: editingLead.notes,
          campaign_id: editingLead.campaign_id
        })
        .eq('id', selectedLead.id)

      if (error) {
        console.error('Error updating lead:', error)
        alert('Failed to update lead')
        return
      }

      // Update the lead in the local state
      const updatedLead = { ...editingLead, status: finalStatus }
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === selectedLead.id 
            ? { ...lead, ...updatedLead }
            : lead
        )
      )

      // Update selected lead and editing lead
      setSelectedLead({ ...selectedLead, ...updatedLead })
      setEditingLead(updatedLead)
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  // Add touchpoint
  const handleAddTouchpoint = async () => {
    if (!selectedLead || !newTouchpoint.type) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('touchpoints')
        .insert({
          lead_id: selectedLead.id,
          type: newTouchpoint.type,
          subject: newTouchpoint.subject,
          content: newTouchpoint.content,
          completed_at: newTouchpoint.completed_at,
          outcome: newTouchpoint.outcome
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding touchpoint:', error)
        alert('Failed to add touchpoint')
        return
      }

      // Refresh touchpoints
      await fetchTouchpoints(selectedLead.id)
      
      // Update lead's last_contacted_at if this touchpoint has a completed_at date
      if (newTouchpoint.completed_at) {
        await supabase
          .from('leads')
          .update({ last_contacted_at: newTouchpoint.completed_at })
          .eq('id', selectedLead.id)
      }

      // Update the touchpoints count in local state immediately (only count completed touchpoints with outcomes)
      const completedTouchpointsWithOutcomes = touchpoints.filter(tp => tp.completed_at && tp.outcome)
      const updatedTouchpointCount = completedTouchpointsWithOutcomes.length + (newTouchpoint.completed_at && newTouchpoint.outcome ? 1 : 0)
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === selectedLead.id 
            ? { ...lead, touchpoints_count: updatedTouchpointCount, last_contacted_at: newTouchpoint.completed_at || lead.last_contacted_at }
            : lead
        )
      )

      // Update selected lead
      setSelectedLead(prev => prev ? { 
        ...prev, 
        touchpoints_count: updatedTouchpointCount,
        last_contacted_at: newTouchpoint.completed_at || prev.last_contacted_at
      } : null)

      // Reset form
      setNewTouchpoint({
        type: 'email',
        completed_at: new Date().toISOString().slice(0, 16)
      })
      setShowNewTouchpointForm(false)
    } catch (error) {
      console.error('Error adding contact attempt:', error)
      alert('Failed to add contact attempt')
    } finally {
      setSaving(false)
    }
  }

  // Sync with Instantly
  // const handleSyncInstantly = async () => {
  //   try {
  //     setSyncing(true)
  //     setSyncResults(null)
      
  //     // Get all lead IDs or selected lead IDs
  //     const leadIdsToSync = selectedLeads.length > 0 ? selectedLeads : filteredLeads.map(lead => lead.id)
      
  //     if (leadIdsToSync.length === 0) {
  //       alert('No leads to sync')
  //       return
  //     }

  //     const response = await fetch('/api/sync-instantly', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         leadIds: leadIdsToSync
  //       })
  //     })

  //     const result = await response.json()

  //     if (!response.ok) {
  //       throw new Error(result.error || 'Sync failed')
  //     }

  //     setSyncResults(result)
      
  //     // Refresh leads and touchpoints to show updated data
  //     await fetchLeads()
  //     if (selectedLead) {
  //       await fetchTouchpoints(selectedLead.id)
  //     }

  //     // Show success message
  //     const message = `Sync completed! ${result.syncedCount} new contact attempts added from ${result.totalEmails} emails.`
  //     alert(message)

  //   } catch (error) {
  //     console.error('Sync error:', error)
  //     alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  //   } finally {
  //     setSyncing(false)
  //   }
  // }

  // Get unique values for filters
  const uniqueSources = selectedCompany === 'Avalern' 
    ? [] // No sources for district contacts
    : [...new Set((leads || []).map(l => l.source).filter((source): source is string => Boolean(source)))].sort()
  
  const uniqueCities = selectedCompany === 'Avalern'
    ? [...new Set((districtContacts || []).map(c => c.district_lead?.county).filter((county): county is string => Boolean(county)))].sort()
    : [...new Set((leads || []).map(l => l.city).filter((city): city is string => Boolean(city)))].sort()
  
  const availableStatuses = Object.keys(STATUS_DISPLAY_MAP)
  const totalCompanyLeads = selectedCompany === 'Avalern' ? districtContacts.length : leads.length

  // Pagination info
  const currentData = selectedCompany === 'Avalern' ? filteredDistrictContacts : filteredLeads
  const totalPages = Math.ceil(currentData.length / itemsPerPage)
  const totalFilteredCount = currentData.length
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, currentData.length)

  return {
    // Data
    leads: selectedCompany === 'Avalern' ? [] : paginatedLeads,
    districtContacts: selectedCompany === 'Avalern' ? paginatedDistrictContacts : [],
    allLeads: leads, // All leads for bulk operations
    allDistrictContacts: districtContacts, // All district contacts
    filteredLeads: selectedCompany === 'Avalern' ? [] : filteredLeads,
    filteredDistrictContacts: selectedCompany === 'Avalern' ? filteredDistrictContacts : [],
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
    isAvalern: selectedCompany === 'Avalern',
    
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
  }
} 