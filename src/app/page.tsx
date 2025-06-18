'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
import { supabase } from '../lib/supabase'
import { Campaign, Lead, Touchpoint } from '../types/database'
import { 
  Users, 
  Mail,
  Phone,
  Calendar,
  Upload,
  Download,
  TrendingUp,
  Target
} from 'lucide-react'
import CalendarPopup from '@/components/CalendarPopup'

interface DashboardStats {
  totalLeads: number
  emailsSent: number
  callsMade: number
  conversions: number
  activeLeads: number
  totalCampaigns: number
}

interface CampaignStats extends Campaign {
  lead_count: number
  email_count: number
  call_count: number
  conversion_count: number
}

export default function Dashboard() {
  const { selectedCompany } = useCompany()
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    emailsSent: 0,
    callsMade: 0,
    conversions: 0,
    activeLeads: 0,
    totalCampaigns: 0
  })
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([])
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [scheduledTouchpoints, setScheduledTouchpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedType, setSelectedType] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const touchpointsPerPage = 20

  // Fetch dashboard data from Supabase
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch campaigns for selected company
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('company', selectedCompany)

        if (campaignsError) {
          console.error('Error fetching campaigns:', campaignsError)
          // Continue with empty campaigns data
        }

        // Fetch leads for selected company campaigns
        const campaignIds = campaignsData?.map(c => c.id) || []
        
        let leadsData = null
        if (campaignIds.length > 0) {
          const { data: fetchedLeadsData, error: leadsError } = await supabase
            .from('leads')
            .select('*')
            .in('campaign_id', campaignIds)

          if (leadsError) {
            console.error('Error fetching leads:', leadsError)
          } else {
            leadsData = fetchedLeadsData
          }
        }

        // Fetch touchpoints for email and call counts
        const leadIds = leadsData?.map(l => l.id) || []
        
        let touchpointsData = []
        if (leadIds.length > 0) {
          try {
            const { data: fetchedTouchpointsData, error: touchpointsError } = await supabase
              .from('touchpoints')
              .select('*')
              .in('lead_id', leadIds)

            if (touchpointsError) {
              console.error('Error fetching touchpoints:', touchpointsError.message || touchpointsError.details || touchpointsError.hint || 'Unknown error')
              touchpointsData = []
            } else {
              touchpointsData = fetchedTouchpointsData || []
            }
          } catch (error) {
            console.error('Unexpected error fetching touchpoints:', error)
            touchpointsData = []
          }
        }

        // Calculate stats - focus on today's activities
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        
        const totalLeads = leadsData?.length || 0
        const emailsMadeToday = touchpointsData?.filter(t => 
          t.type === 'email' && 
          t.completed_at && 
          new Date(t.completed_at) >= todayStart && 
          new Date(t.completed_at) < todayEnd
        ).length || 0
        const callsMadeToday = touchpointsData?.filter(t => 
          t.type === 'call' && 
          t.completed_at && 
          new Date(t.completed_at) >= todayStart && 
          new Date(t.completed_at) < todayEnd
        ).length || 0
        const activeLeads = leadsData?.filter(l => !['won', 'lost'].includes(l.status)).length || 0

        setStats({
          totalLeads: totalLeads,
          emailsSent: emailsMadeToday,
          callsMade: callsMadeToday,
          conversions: 0, // Remove conversions from display
          activeLeads: activeLeads,
          totalCampaigns: campaignsData?.length || 0
        })

        // Calculate campaign stats
        const campaignStats: CampaignStats[] = campaignsData?.map(campaign => {
          const campaignLeads = leadsData?.filter(l => l.campaign_id === campaign.id) || []
          const campaignLeadIds = campaignLeads.map(l => l.id)
          const campaignTouchpoints = touchpointsData?.filter(t => campaignLeadIds.includes(t.lead_id)) || []

          return {
            ...campaign,
            lead_count: campaignLeads.length,
            email_count: campaignTouchpoints.filter(t => t.type === 'email').length,
            call_count: campaignTouchpoints.filter(t => t.type === 'call').length,
            conversion_count: campaignLeads.filter(l => l.status === 'won').length
          }
        }) || []

        setCampaigns(campaignStats)

        // Set recent leads (last 5)
        const sortedLeads = (leadsData || []).sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5)
        
        setRecentLeads(sortedLeads)

        // Initialize scheduled touchpoints as empty - will be loaded by filter function
        setScheduledTouchpoints([])

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [selectedCompany])

  // Load filtered touchpoints after initial data is loaded
  useEffect(() => {
    if (!loading) {
      fetchFilteredTouchpoints()
      fetchTouchpointCounts()
    }
  }, [loading])

  // Apply filters when filter values change
  useEffect(() => {
    if (!loading) {
      fetchFilteredTouchpoints()
      fetchTouchpointCounts()
    }
  }, [selectedDate, selectedType, selectedCampaign])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDate, selectedType, selectedCampaign])

  // Calculate pagination
  const totalPages = Math.ceil(scheduledTouchpoints.length / touchpointsPerPage)
  const startIndex = (currentPage - 1) * touchpointsPerPage
  const endIndex = startIndex + touchpointsPerPage
  const paginatedTouchpoints = scheduledTouchpoints.slice(startIndex, endIndex)

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      change: `${stats.activeLeads} active leads`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Emails Made Today',
      value: stats.emailsSent.toLocaleString(),
      change: 'Completed today',
      icon: Mail,
      color: 'green'
    },
    {
      title: 'Calls Made Today',
      value: stats.callsMade.toLocaleString(),
      change: 'Completed today',
      icon: Phone,
      color: 'orange'
    },
    {
      title: 'Active Campaigns',
      value: stats.totalCampaigns.toLocaleString(),
      change: `${selectedCompany} campaigns`,
      icon: Target,
      color: 'purple'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return '1 day ago'
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'not_contacted': 'bg-gray-100 text-gray-800',
      'emailed': 'bg-blue-100 text-blue-800',
      'warm': 'bg-orange-100 text-orange-800',
      'called': 'bg-purple-100 text-purple-800',
      'booked': 'bg-green-100 text-green-800',
      'won': 'bg-emerald-100 text-emerald-800',
      'lost': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.not_contacted
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'not_contacted': 'Not Contacted',
      'emailed': 'Emailed',
      'warm': 'Warm',
      'called': 'Called',
      'booked': 'Booked',
      'won': 'Won',
      'lost': 'Lost'
    }
    return labels[status as keyof typeof labels] || status
  }

  const handleImportLeads = () => {
    window.location.href = '/import'
  }

  const handleExportLeads = () => {
    window.location.href = '/leads'
  }

  const fetchFilteredTouchpoints = async () => {
    try {
      // Build query parameters for specific date
      const params = new URLSearchParams()
      params.append('date', selectedDate)
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign)
      }

      const response = await fetch(`/api/daily-touchpoints?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        let allTouchpoints = result.touchpoints || []

        // Apply type filter if selected
        if (selectedType) {
          allTouchpoints = allTouchpoints.filter((tp: any) => tp.type === selectedType)
        }

        setScheduledTouchpoints(allTouchpoints)
      } else {
        console.error('Error fetching filtered touchpoints:', result.error)
        setScheduledTouchpoints([])
      }
    } catch (error) {
      console.error('Error fetching filtered touchpoints:', error)
      setScheduledTouchpoints([])
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

  const markTouchpointComplete = async (touchpointId: string, outcome: string) => {
    try {
      const response = await fetch('/api/daily-touchpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          touchpointId, 
          outcomeEnum: outcome,
          notes: `Completed via dashboard`
        })
      })

      if (response.ok) {
        // Refresh filtered touchpoints instead of full page reload
        fetchFilteredTouchpoints()
      } else {
        alert('Failed to mark touchpoint as complete')
      }
    } catch (error) {
      console.error('Error completing touchpoint:', error)
      alert('Failed to complete touchpoint')
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's what's happening with {selectedCompany} campaigns.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleImportLeads}
            className="flex items-center justify-between p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-blue-900">Import New Leads</h3>
                <p className="text-sm text-blue-700">Upload CSV files to add prospects</p>
              </div>
            </div>
            <span className="text-blue-600 text-xl">→</span>
          </button>
          
          <button 
            onClick={handleExportLeads}
            className="flex items-center justify-between p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-green-900">Export Leads</h3>
                <p className="text-sm text-green-700">Download leads for campaigns</p>
              </div>
            </div>
            <span className="text-green-600 text-xl">→</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Touchpoint Filters */}
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
                <option value="meeting">Meeting</option>
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

        {/* Scheduled Touchpoints */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Scheduled Touchpoints</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDate ? `Touchpoints for ${new Date(selectedDate).toLocaleDateString()}` : `Upcoming touchpoints for ${selectedCompany}`}
                </p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Total: {scheduledTouchpoints.length}</span>
                {totalPages > 1 && (
                  <span>Page {currentPage} of {totalPages}</span>
                )}
                {!selectedDate && (
                  <>
                    <span>Today: {scheduledTouchpoints.filter(tp => new Date(tp.scheduled_at).toDateString() === new Date().toDateString()).length}</span>
                    <span>Overdue: {scheduledTouchpoints.filter(tp => new Date(tp.scheduled_at) < new Date()).length}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            {scheduledTouchpoints.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No scheduled touchpoints found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Go to the Outreach page to create touchpoint sequences for your leads
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedTouchpoints.map((touchpoint) => {
                  const scheduledDate = new Date(touchpoint.scheduled_at)
                  const isOverdue = scheduledDate < new Date()
                  const isToday = scheduledDate.toDateString() === new Date().toDateString()
                  
                  return (
                    <div 
                      key={touchpoint.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        isOverdue ? 'bg-red-50 border-red-200' : 
                        isToday ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
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
                              {(touchpoint.lead.campaign as any).name}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-medium bg-red-100 px-2 py-1 rounded">
                              OVERDUE
                            </span>
                          )}
                          {isToday && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">
                              TODAY
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-gray-500">{touchpoint.lead?.email}</p>
                          <p className="text-xs text-gray-500">
                                                                Scheduled: {scheduledDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => markTouchpointComplete(touchpoint.id, 'replied')}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          Replied
                        </button>
                        <button
                          onClick={() => markTouchpointComplete(touchpoint.id, 'no_answer')}
                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                        >
                          No Answer
                        </button>
                      </div>
                    </div>
                  )
                })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, scheduledTouchpoints.length)} of {scheduledTouchpoints.length} touchpoints
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Recent Activity & Campaign Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h3>
            <div className="space-y-4">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${selectedCompany === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{lead.email}</p>
                        <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No leads found. Import some leads to get started!</p>
              )}
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedCompany} Campaign Performance</h3>
            <div className="space-y-4">
              {campaigns.length > 0 ? (
                campaigns.map((campaign, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${campaign.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {campaign.lead_count > 0 ? Math.round((campaign.conversion_count / campaign.lead_count) * 100) : 0}% conversion
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500">Leads</p>
                        <p className="font-semibold text-gray-900">{campaign.lead_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Emails</p>
                        <p className="font-semibold text-gray-900">{campaign.email_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Calls</p>
                        <p className="font-semibold text-gray-900">{campaign.call_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Conversions</p>
                        <p className="font-semibold text-gray-900">{campaign.conversion_count}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No campaigns found for {selectedCompany}.</p>
              )}
            </div>
          </div>
        </div>

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
