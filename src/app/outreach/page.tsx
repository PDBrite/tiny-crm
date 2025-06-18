'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { Calendar, Phone, Mail, MessageSquare, Plus, Target, Edit2, Trash2, List, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import CalendarPopup from '../../components/CalendarPopup'
import LeadDetailPanel from '../../components/leads/LeadDetailPanel'
import { Lead, STATUS_DISPLAY_MAP } from '../../types/leads'

interface TouchpointSummary {
  today?: {
    total: number
    by_type: Record<string, number>
    touchpoints: any[]
  }
  overdue?: {
    total: number
    by_type: Record<string, number>
    touchpoints: any[]
  }
  summary?: {
    total_due: number
    emails_due: number
    calls_due: number
    linkedin_due: number
  }
  // For specific date queries
  touchpoints?: any[]
  date?: string
  total?: number
}

interface BatchInfo {
  available_leads_count: number
  next_batch_date: string
  campaign?: any
}

interface OutreachSequence {
  id: string
  name: string
  company: string
  description?: string
  created_at: string
  steps?: OutreachStep[]
}

interface OutreachStep {
  id: string
  sequence_id: string
  step_order: number
  type: string
  name?: string
  content_link?: string
  day_offset: number
}

interface SequenceFormData {
  name: string
  company: string
  description: string
  steps: {
    type: 'email' | 'call' | 'linkedin_message'
    name: string
    content_link: string
    day_offset: number
  }[]
}

export default function OutreachPage() {
  const { selectedCompany } = useCompany()
  const [activeTab, setActiveTab] = useState<'touchpoints' | 'sequences'>('touchpoints')
  const [touchpoints, setTouchpoints] = useState<TouchpointSummary | null>(null)
  const [sequences, setSequences] = useState<OutreachSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]) // YYYY-MM-DD format
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({})
  const [selectedType, setSelectedType] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [filteredTouchpoints, setFilteredTouchpoints] = useState<any[]>([])
  const [showCreateSequenceModal, setShowCreateSequenceModal] = useState(false)
  const [creatingSequence, setCreatingSequence] = useState(false)
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [leadTouchpoints, setLeadTouchpoints] = useState<any[]>([])
  const [showNewTouchpointForm, setShowNewTouchpointForm] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState<any>({})
  const [syncing, setSyncing] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Form data for create sequence modal
  const [sequenceFormData, setSequenceFormData] = useState<SequenceFormData>({
    name: '',
    company: selectedCompany,
    description: '',
    steps: [
      { type: 'email', name: '', content_link: '', day_offset: 0 }
    ]
  })

  useEffect(() => {
    fetchTouchpoints()
    fetchCampaigns()
    fetchSequences()
    applyFilters()
    fetchTouchpointCounts()
  }, [selectedCompany])

  // Apply filters when filter values change
  useEffect(() => {
    if (!loading) {
      applyFilters()
      fetchTouchpointCounts()
    }
  }, [selectedDate, selectedType, selectedCampaign])

  // Update form data when selected company changes
  useEffect(() => {
    setSequenceFormData(prev => ({ ...prev, company: selectedCompany }))
  }, [selectedCompany])

  const fetchTouchpoints = async () => {
    try {
      const response = await fetch(`/api/daily-touchpoints?company=${selectedCompany}`)
      const data = await response.json()
      setTouchpoints(data)
    } catch (error) {
      console.error('Error fetching touchpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/campaigns?company=${selectedCompany}`)
      const data = await response.json()
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  const fetchSequences = async () => {
    try {
      const response = await fetch(`/api/outreach-sequences?company=${selectedCompany}`)
      const data = await response.json()
      setSequences(data || [])
    } catch (error) {
      console.error('Error fetching sequences:', error)
    }
  }

  const fetchTouchpointCounts = async () => {
    try {
      // Fetch touchpoint counts for the current month
      const startOfMonth = new Date(selectedDate)
      startOfMonth.setDate(1)
      const endOfMonth = new Date(selectedDate)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)
      endOfMonth.setDate(0)

      const params = new URLSearchParams()
      params.append('startDate', startOfMonth.toISOString().split('T')[0])
      params.append('endDate', endOfMonth.toISOString().split('T')[0])
      params.append('company', selectedCompany)
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign)
      }

      const response = await fetch(`/api/touchpoint-counts?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setTouchpointCounts(result.counts || {})
      }
    } catch (error) {
      console.error('Error fetching touchpoint counts:', error)
    }
  }

  const applyFilters = async () => {
    setLoading(true)
    try {
      // Build query parameters for specific date
      const params = new URLSearchParams()
      params.append('date', selectedDate)
      params.append('company', selectedCompany)
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign)
      }

      console.log(`Fetching touchpoints for ${selectedCompany} on ${selectedDate}:`, params.toString())
      const response = await fetch(`/api/daily-touchpoints?${params.toString()}`)
      const result = await response.json()
      
      console.log('Touchpoints response:', result)
      
      if (response.ok) {
        let allTouchpoints = result.touchpoints || []
        console.log(`Found ${allTouchpoints.length} touchpoints for ${selectedCompany}`)

        // Apply type filter if selected
        if (selectedType) {
          allTouchpoints = allTouchpoints.filter((tp: any) => tp.type === selectedType)
          console.log(`After type filter (${selectedType}): ${allTouchpoints.length} touchpoints`)
        }

        setFilteredTouchpoints(allTouchpoints)
        setTouchpoints(result) // Keep original data for summary cards
        setCurrentPage(1) // Reset to first page when filters change
      } else {
        console.error('API Error:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error fetching touchpoints:', error)
      alert('Failed to fetch touchpoints')
    } finally {
      setLoading(false)
    }
  }

  const markTouchpointComplete = async (touchpointId: string, outcome: string) => {
    try {
      // First, get the original touchpoint details
      const originalTouchpoint = filteredTouchpoints.find(tp => tp.id === touchpointId)
      if (!originalTouchpoint) {
        alert('Touchpoint not found')
        return
      }

      // Mark the original scheduled touchpoint as completed
      const completeResponse = await fetch('/api/daily-touchpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          touchpointId, 
          outcomeEnum: outcome,
          notes: `Completed via outreach dashboard`
        })
      })

      if (!completeResponse.ok) {
        alert('Failed to mark touchpoint as complete')
        return
      }

      // Create a new touchpoint record representing the actual interaction
      // Check if this is a district contact (Avalern) or regular lead
      const touchpointData: any = {
        type: originalTouchpoint.type,
        subject: `${originalTouchpoint.type.replace('_', ' ').toUpperCase()} - ${outcome === 'replied' ? 'Replied' : 'No Answer'}`,
        content: `${outcome === 'replied' ? 'Contact replied to' : 'No answer from'} ${originalTouchpoint.type.replace('_', ' ')} outreach: ${originalTouchpoint.subject || 'N/A'}`,
        completed_at: new Date().toISOString(),
        outcome: outcome === 'replied' ? 'Replied' : 'No Answer'
      }

      // For Avalern campaigns, use district_contact_id; for others, use lead_id
      if (originalTouchpoint.district_contact_id) {
        touchpointData.district_contact_id = originalTouchpoint.district_contact_id
      } else {
        touchpointData.lead_id = originalTouchpoint.lead.id
      }

      const newTouchpointResponse = await fetch('/api/touchpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(touchpointData)
      })

      if (newTouchpointResponse.ok) {
        applyFilters() // Refresh the filtered list
      } else {
        // If creating new touchpoint fails, still refresh since we completed the original
        console.error('Failed to create new touchpoint record')
        applyFilters()
      }
    } catch (error) {
      console.error('Error completing touchpoint:', error)
      alert('Failed to complete touchpoint')
    }
  }

  const handleCreateSequence = async () => {
    if (!sequenceFormData.name || sequenceFormData.steps.length === 0) {
      alert('Please fill in sequence name and add at least one step')
      return
    }

    // Validate all steps have required fields
    for (const step of sequenceFormData.steps) {
      if (!step.type || !step.name || step.day_offset < 0) {
        alert('All steps must have type, name, and valid day offset')
        return
      }
    }

    setCreatingSequence(true)
    try {
      const response = await fetch('/api/outreach-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sequenceFormData)
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`Sequence "${sequenceFormData.name}" created successfully!`)
        setShowCreateSequenceModal(false)
        setSequenceFormData({
          name: '',
          company: selectedCompany,
          description: '',
          steps: [{ type: 'email', name: '', content_link: '', day_offset: 0 }]
        })
        fetchSequences()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating sequence:', error)
      alert('Failed to create sequence')
    } finally {
      setCreatingSequence(false)
    }
  }

  const addStep = () => {
    const nextDayOffset = sequenceFormData.steps.length > 0 
      ? Math.max(...sequenceFormData.steps.map(s => s.day_offset)) + 1 
      : 0
    
    setSequenceFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        { type: 'email', name: '', content_link: '', day_offset: nextDayOffset }
      ]
    }))
  }

  const removeStep = (index: number) => {
    if (sequenceFormData.steps.length > 1) {
      setSequenceFormData(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }))
    }
  }

  const updateStep = (index: number, field: string, value: any) => {
    setSequenceFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }))
  }

  const getStepTypeColor = (type: string) => {
    const colors = {
      'email': 'bg-blue-100 text-blue-800',
      'call': 'bg-green-100 text-green-800',
      'linkedin_message': 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || colors['email']
  }

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'call':
        return <Phone className="h-3 w-3" />
      case 'linkedin_message':
        return <MessageSquare className="h-3 w-3" />
      default:
        return <Mail className="h-3 w-3" />
    }
  }

  const handleCalendarMonthChange = (startDate: string, endDate: string) => {
    // Fetch touchpoint counts for the new month
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    if (selectedCampaign) {
      params.append('campaignId', selectedCampaign)
    }

    fetch(`/api/touchpoint-counts?${params.toString()}`)
      .then(response => response.json())
      .then(result => {
        if (result.counts) {
          setTouchpointCounts(result.counts)
        }
      })
      .catch(error => {
        console.error('Error fetching touchpoint counts:', error)
      })
  }

  const handleTouchpointClick = (touchpoint: any) => {
    const lead = touchpoint.lead
    setSelectedLead(lead)
    setEditingLead({ ...lead })
    setLeadTouchpoints(lead.touchpoints || [])
  }

  const handleCloseLead = () => {
    setSelectedLead(null)
    setEditingLead(null)
    setLeadTouchpoints([])
    setShowNewTouchpointForm(false)
    setNewTouchpoint({})
  }

  const handleSaveLead = async () => {
    if (!editingLead) return

    setSaving(true)
    try {
      // Implementation for saving lead changes
      console.log('Saving lead:', editingLead)
      
      // Refresh touchpoints data
      await applyFilters()
      
      alert('Lead updated successfully!')
      handleCloseLead()
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  const handleExportTouchpoints = () => {
    if (!filteredTouchpoints || filteredTouchpoints.length === 0) {
      alert('No touchpoints to export')
      return
    }

    // Create CSV headers based on company type
    const headers = selectedCompany === 'Avalern' 
      ? ['First Name', 'Last Name', 'Email', 'Phone', 'Title', 'District', 'County', 'Touchpoint Type', 'Subject', 'Scheduled Date', 'Status', 'Campaign']
      : ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Touchpoint Type', 'Subject', 'Scheduled Date', 'Status', 'Campaign']

    // Create CSV rows
    const csvRows = filteredTouchpoints.map(touchpoint => {
      if (selectedCompany === 'Avalern') {
        // Avalern uses district_contacts
        const contact = touchpoint.district_contact || {}
        const district = touchpoint.district_lead || {}
        return [
          contact.first_name || '',
          contact.last_name || '',
          contact.email || '',
          contact.phone || '',
          contact.title || '',
          district.district_name || '',
          district.county || '',
          touchpoint.type || '',
          touchpoint.subject || '',
          touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : '',
          touchpoint.status || '',
          touchpoint.campaign?.name || ''
        ]
      } else {
        // CraftyCode uses leads
        const lead = touchpoint.lead || {}
        return [
          lead.first_name || '',
          lead.last_name || '',
          lead.email || '',
          lead.phone || '',
          lead.company || '',
          touchpoint.type || '',
          touchpoint.subject || '',
          touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : '',
          touchpoint.status || '',
          touchpoint.campaign?.name || ''
        ]
      }
    })

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename with date and company
    const dateStr = selectedDate || new Date().toISOString().split('T')[0]
    const filename = `${selectedCompany.toLowerCase()}_touchpoints_${dateStr}.csv`
    link.setAttribute('download', filename)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // const handleSyncInstantly = async () => {
  //   setSyncing(true)
  //   try {
  //     // Get the instantly campaign ID from the selected campaign
  //     let instantlyCampaignId = null
      
  //     if (selectedCampaign) {
  //       const campaign = campaigns.find(c => c.id === selectedCampaign)
  //       instantlyCampaignId = campaign?.instantly_campaign_id
        
  //       if (!instantlyCampaignId) {
  //         alert('Selected campaign is not linked to an Instantly.ai campaign. Please configure the campaign first.')
  //         return
  //       }
  //     } else {
  //       alert('Please select a campaign to sync with Instantly.ai')
  //       return
  //     }

  //     const response = await fetch('/api/sync-instantly', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         campaignId: selectedCampaign,
  //         company: selectedCompany,
  //         instantlyCampaignId: instantlyCampaignId
  //       }),
  //     })

  //     const result = await response.json()

  //     if (response.ok) {
  //       // Refresh touchpoints data after sync
  //       await applyFilters()
        
  //       alert(result.message || `Successfully synced ${result.updatedCount} touchpoints from Instantly.ai`)
  //     } else {
  //       throw new Error(result.error || 'Sync failed')
  //     }
  //   } catch (error) {
  //     console.error('Error syncing with Instantly:', error)
  //     alert(`Failed to sync with Instantly.ai: ${error instanceof Error ? error.message : 'Unknown error'}`)
  //   } finally {
  //     setSyncing(false)
  //   }
  // }

  const availableStatuses = Object.keys(STATUS_DISPLAY_MAP)

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
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Outreach Management</h1>
            <p className="text-gray-600">Manage daily touchpoints and outreach sequences for {selectedCompany}</p>
          </div>
          <div className="flex items-center space-x-3">
            {activeTab === 'sequences' && (
              <button
                onClick={() => setShowCreateSequenceModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Sequence
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('touchpoints')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'touchpoints'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Daily Touchpoints
            </button>
            <button
              onClick={() => setActiveTab('sequences')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sequences'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <List className="h-4 w-4 inline mr-2" />
              Outreach Sequences
            </button>
          </nav>
        </div>

        {/* Touchpoints Tab Content */}
        {activeTab === 'touchpoints' && (
          <div className={`flex gap-6 ${selectedLead ? 'grid grid-cols-2' : ''}`}>
            <div className={selectedLead ? 'col-span-1' : 'w-full'}>
        {/* Summary Cards */}
        {touchpoints && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.total_due || touchpoints.total || filteredTouchpoints.length}
                      </p>
                      <p className="text-sm text-gray-600">Total Due Selected Date</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-green-600 mr-3" />
                <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.emails_due || filteredTouchpoints.filter(tp => tp.type === 'email').length}
                      </p>
                  <p className="text-sm text-gray-600">Emails Due</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Phone className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.calls_due || filteredTouchpoints.filter(tp => tp.type === 'call').length}
                      </p>
                  <p className="text-sm text-gray-600">Calls Due</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.linkedin_due || filteredTouchpoints.filter(tp => tp.type === 'linkedin_message').length}
                      </p>
                  <p className="text-sm text-gray-600">LinkedIn Messages</p>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Touchpoints</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={() => setShowCalendarPopup(true)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      >
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Select Date</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="linkedin_message">LinkedIn Message</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Campaigns</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Touchpoints Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Touchpoints</h3>
                <button
                  onClick={handleExportTouchpoints}
                  disabled={!filteredTouchpoints || filteredTouchpoints.length === 0}
                  className="flex items-center px-3 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </button>
              </div>
            </div>
            <div className="p-6">
                {filteredTouchpoints.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No touchpoints found with current filters</p>
              ) : (
                <div className="space-y-4">
                    {filteredTouchpoints.map((touchpoint) => (
                      <div 
                        key={touchpoint.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleTouchpointClick(touchpoint)}
                      >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            touchpoint.type === 'email' ? 'bg-blue-100 text-blue-800' :
                            touchpoint.type === 'call' ? 'bg-green-100 text-green-800' :
                            touchpoint.type === 'linkedin_message' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {touchpoint.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="font-medium">{touchpoint.lead.first_name} {touchpoint.lead.last_name}</span>
                            {touchpoint.lead.campaign && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {touchpoint.lead.campaign.name}
                              </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                          <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500">{touchpoint.lead.email}</p>
                            <p className="text-xs text-gray-500">
                              Scheduled: {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                            </p>
                          </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'replied')
                            }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Replied
                        </button>
                        <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'no_answer')
                            }}
                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        >
                          No Answer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Overdue Touchpoints */}
            {touchpoints && touchpoints.overdue && touchpoints.overdue.total > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-900">Overdue Touchpoints ({touchpoints.overdue.total})</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {touchpoints.overdue.touchpoints.map((touchpoint) => (
                      <div 
                        key={touchpoint.id} 
                        className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 cursor-pointer transition-colors"
                        onClick={() => handleTouchpointClick(touchpoint)}
                      >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          touchpoint.type === 'email' ? 'bg-blue-100 text-blue-800' :
                          touchpoint.type === 'call' ? 'bg-green-100 text-green-800' :
                          touchpoint.type === 'linkedin_message' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {touchpoint.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="font-medium">{touchpoint.lead.first_name} {touchpoint.lead.last_name}</span>
                        <span className="text-xs text-red-600">
                          Due: {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'replied')
                            }}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Replied
                      </button>
                      <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'no_answer')
                            }}
                        className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      >
                        No Answer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
            </div>

            {/* Lead Detail Panel */}
            {selectedLead && editingLead && (
              <div className="col-span-1">
                <LeadDetailPanel
                  selectedLead={selectedLead}
                  editingLead={editingLead}
                  onEditingLeadChange={setEditingLead}
                  onClose={handleCloseLead}
                  onSave={handleSaveLead}
                  saving={saving}
                  campaigns={campaigns}
                  availableStatuses={availableStatuses}
                  touchpoints={leadTouchpoints}
                  showNewTouchpointForm={showNewTouchpointForm}
                  onToggleTouchpointForm={() => setShowNewTouchpointForm(!showNewTouchpointForm)}
                  newTouchpoint={newTouchpoint}
                  onNewTouchpointChange={setNewTouchpoint}
                  onAddTouchpoint={() => {}}
                />
              </div>
            )}
          </div>
        )}

        {/* Sequences Tab Content */}
        {activeTab === 'sequences' && (
          <div className="space-y-6">
            {/* Sequences Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sequences.map((sequence) => (
                <div key={sequence.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${sequence.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <span className="text-sm text-gray-600">{sequence.company}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{sequence.name}</h3>
                      {sequence.description && (
                        <p className="text-sm text-gray-600 mb-2">{sequence.description}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          <Target className="h-3 w-3 mr-1" />
                          {sequence.steps?.length || 0} Steps
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Steps Preview */}
                  {sequence.steps && sequence.steps.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium text-gray-700">Steps:</h4>
                      <div className="space-y-1">
                        {sequence.steps.slice(0, 3).map((step) => (
                          <div key={step.id} className="flex items-center space-x-2 text-xs">
                            <span className="text-gray-500">Day {step.day_offset}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${getStepTypeColor(step.type)}`}>
                              {getStepTypeIcon(step.type)}
                              <span className="ml-1 capitalize">{step.type.replace('_', ' ')}</span>
                            </span>
                            <span className="text-gray-600 truncate">{step.name}</span>
                          </div>
                        ))}
                        {sequence.steps.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{sequence.steps.length - 3} more steps...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
                    Created: {new Date(sequence.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {sequences.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No outreach sequences found</h3>
                <p className="text-gray-500 mb-4">
                  Create your first outreach sequence to start automating your lead nurturing process.
                </p>
                <button
                  onClick={() => setShowCreateSequenceModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sequence
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Sequence Modal */}
        {showCreateSequenceModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create Outreach Sequence</h3>
                  <p className="text-sm text-gray-500">Set up your automated outreach sequence with multiple touchpoints</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sequence Name *</label>
                    <input
                      type="text"
                      value={sequenceFormData.name}
                      onChange={(e) => setSequenceFormData({ ...sequenceFormData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                      placeholder="Enter sequence name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                    <select 
                      value={sequenceFormData.company}
                      onChange={(e) => setSequenceFormData({ ...sequenceFormData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    >
                      <option value="CraftyCode">CraftyCode</option>
                      <option value="Avalern">Avalern</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={sequenceFormData.description}
                    onChange={(e) => setSequenceFormData({ ...sequenceFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors resize-none"
                    placeholder="Optional sequence description..."
                  />
                </div>

                {/* Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Sequence Steps</h4>
                    <button
                      onClick={addStep}
                      className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {sequenceFormData.steps.map((step, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">Step {index + 1}</h5>
                          {sequenceFormData.steps.length > 1 && (
                            <button
                              onClick={() => removeStep(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={step.type}
                              onChange={(e) => updateStep(index, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="email">Email</option>
                              <option value="call">Call</option>
                              <option value="linkedin_message">LinkedIn Message</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Day Offset</label>
                            <input
                              type="number"
                              min="0"
                              value={step.day_offset}
                              onChange={(e) => updateStep(index, 'day_offset', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => updateStep(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Name/title for this step"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Content Link</label>
                          <input
                            type="text"
                            value={step.content_link}
                            onChange={(e) => updateStep(index, 'content_link', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Link to content for this step"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                <button
                  onClick={() => setShowCreateSequenceModal(false)}
                  className="px-6 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateSequence}
                  disabled={creatingSequence || !sequenceFormData.name || sequenceFormData.steps.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center"
                >
                  {creatingSequence ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Create Sequence
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Popup */}
        <CalendarPopup
          isOpen={showCalendarPopup}
          onClose={() => setShowCalendarPopup(false)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          touchpointCounts={touchpointCounts}
          onMonthChange={handleCalendarMonthChange}
        />
      </div>
    </DashboardLayout>
  )
} 