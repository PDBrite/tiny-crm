'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  const [touchpoints, setTouchpoints] = useState<TouchpointSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]) // YYYY-MM-DD format
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({})
  const [selectedType, setSelectedType] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [filteredTouchpoints, setFilteredTouchpoints] = useState<any[]>([])
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [saving, setSaving] = useState(false)
  const [leadTouchpoints, setLeadTouchpoints] = useState<any[]>([])
  const [showNewTouchpointForm, setShowNewTouchpointForm] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState<any>({})
  
  // A single effect to load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true)
      try {
        // Load data in parallel
        const [campaignsResponse] = await Promise.all([
          fetch(`/api/campaigns?company=${selectedCompany}`)
        ]);
        
        const campaigns = await campaignsResponse.json();
        setCampaigns(campaigns || []);

        // Now that we have campaigns, we can load the filtered touchpoints
        await fetchFilteredTouchpoints();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, [selectedCompany]);

  // Effect for filters only
  useEffect(() => {
    if (!loading) {
      fetchFilteredTouchpoints();
    }
  }, [selectedDate, selectedType, selectedCampaign]);

  const fetchFilteredTouchpoints = async () => {
    setLoading(true);
    try {
      // Build query parameters for specific date and load touchpoints
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      params.append('company', selectedCompany);
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign);
      }

      // Fetch touchpoints and counts in parallel
      const [touchpointsResponse, countsResponse] = await Promise.all([
        fetch(`/api/daily-touchpoints?${params.toString()}`),
        fetchTouchpointCounts()
      ]);
      
      const result = await touchpointsResponse.json();
      
      if (touchpointsResponse.ok) {
        let allTouchpoints = result.touchpoints || [];

        // Apply type filter if selected
        if (selectedType) {
          allTouchpoints = allTouchpoints.filter((tp: any) => tp.type === selectedType);
        }

        // Update all states at once to reduce re-renders
        setFilteredTouchpoints(allTouchpoints);
        setTouchpoints(result);
      } else {
        console.error('API Error:', result.error);
      }
    } catch (error) {
      console.error('Error fetching touchpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTouchpointCounts = async () => {
    try {
      // Fetch touchpoint counts for the current month
      const startOfMonth = new Date(selectedDate);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(selectedDate);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      const params = new URLSearchParams();
      params.append('startDate', startOfMonth.toISOString().split('T')[0]);
      params.append('endDate', endOfMonth.toISOString().split('T')[0]);
      params.append('company', selectedCompany);
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign);
      }

      const response = await fetch(`/api/touchpoint-counts?${params.toString()}`);
      const result = await response.json();
      
      if (response.ok) {
        setTouchpointCounts(result.counts || {});
      }
      return response;
    } catch (error) {
      console.error('Error fetching touchpoint counts:', error);
      return null;
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
        // Refresh data
        fetchFilteredTouchpoints()
      } else {
        // If creating new touchpoint fails, still refresh since we completed the original
        console.error('Failed to create new touchpoint record')
        fetchFilteredTouchpoints()
      }
    } catch (error) {
      console.error('Error completing touchpoint:', error)
      alert('Failed to complete touchpoint')
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
      await fetchFilteredTouchpoints()
      
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

  // Display a loading state while fetching data
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading touchpoints...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Daily Touchpoints</h1>
            <p className="text-gray-600">Manage scheduled touchpoints for {selectedCompany}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/outreach-sequences"
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <List className="h-4 w-4 mr-2" />
              View Sequences
            </Link>
          </div>
        </div>

        {/* Touchpoints Content */}
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
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
                            <span className="font-medium">{touchpoint.lead?.first_name} {touchpoint.lead?.last_name}</span>
                            {touchpoint.lead?.campaign && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {touchpoint.lead.campaign.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-gray-500">{touchpoint.lead?.email}</p>
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
        {selectedLead && (
          <div className="col-span-1">
            <LeadDetailPanel
              selectedLead={editingLead || selectedLead}
              editingLead={editingLead || selectedLead}
              onEditingLeadChange={(lead) => setEditingLead(lead)}
              onClose={handleCloseLead}
              onSave={handleSaveLead}
              saving={saving}
              campaigns={campaigns}
              availableStatuses={Object.keys(STATUS_DISPLAY_MAP)}
              touchpoints={leadTouchpoints}
              showNewTouchpointForm={showNewTouchpointForm}
              onToggleTouchpointForm={() => setShowNewTouchpointForm(!showNewTouchpointForm)}
              newTouchpoint={newTouchpoint}
              onNewTouchpointChange={(tp) => setNewTouchpoint(tp)}
              onAddTouchpoint={() => {}}
            />
          </div>
        )}

        {/* Calendar Popup */}
        {showCalendarPopup && (
          <CalendarPopup
            isOpen={showCalendarPopup}
            onClose={() => setShowCalendarPopup(false)}
            onDateSelect={(date) => {
              setSelectedDate(date)
              setShowCalendarPopup(false)
            }}
            onMonthChange={handleCalendarMonthChange}
            touchpointCounts={touchpointCounts}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </DashboardLayout>
  )
} 