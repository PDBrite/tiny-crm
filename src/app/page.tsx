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
  Target,
  School,
  Building,
  MapPin,
  FileText,
  BarChart3
} from 'lucide-react'
import CalendarPopup from '@/components/CalendarPopup'

interface DashboardStats {
  totalLeads: number
  emailsSent: number
  callsMade: number
  conversions: number
  activeLeads: number
  totalCampaigns: number
  totalDistricts?: number
  districtContacts?: number
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
    totalCampaigns: 0,
    totalDistricts: 0,
    districtContacts: 0
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

  // Company-specific configurations
  const companyConfig = {
    CraftyCode: {
      color: 'blue',
      primaryColor: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-600',
      description: 'Real Estate Lead Generation',
      features: ['Lead Management', 'Email Outreach', 'Call Tracking', 'Campaign Analytics']
    },
    Avalern: {
      color: 'purple', 
      primaryColor: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-600',
      description: 'School District Outreach',
      features: ['District Management', 'Contact Tracking', 'Educational Outreach', 'Institutional Analytics']
    }
  }

  const currentConfig = companyConfig[selectedCompany as keyof typeof companyConfig] || companyConfig.CraftyCode

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
        }

        // Fetch leads for selected company campaigns
        const campaignIds = campaignsData?.map(c => c.id) || []
        
        let leadsData = []
        if (campaignIds.length > 0) {
          const { data: fetchedLeadsData, error: leadsError } = await supabase
            .from('leads')
            .select('*')
            .in('campaign_id', campaignIds)

          if (!leadsError && fetchedLeadsData) {
            leadsData = fetchedLeadsData
          }
        }

        // For Avalern, also fetch district data
        let districtsData = []
        if (selectedCompany === 'Avalern') {
          const { data: fetchedDistrictsData, error: districtsError } = await supabase
            .from('districts')
            .select('*')

          if (!districtsError && fetchedDistrictsData) {
            districtsData = fetchedDistrictsData
          }
        }

        // Fetch touchpoints for email and call counts
        const leadIds = leadsData?.map(l => l.id) || []
        
        let touchpointsData = []
        if (leadIds.length > 0) {
          const { data: fetchedTouchpointsData, error: touchpointsError } = await supabase
            .from('touchpoints')
            .select('*')
            .in('lead_id', leadIds)

          if (!touchpointsError && fetchedTouchpointsData) {
            touchpointsData = fetchedTouchpointsData
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
          conversions: leadsData?.filter(l => l.status === 'won').length || 0,
          activeLeads: activeLeads,
          totalCampaigns: campaignsData?.length || 0,
          totalDistricts: districtsData?.length || 0,
          districtContacts: selectedCompany === 'Avalern' ? totalLeads : 0
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

    if (selectedCompany) {
      fetchDashboardData()
    }
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

  // Company-specific stat cards
  const getStatCards = () => {
    if (selectedCompany === 'Avalern') {
      return [
        {
          title: 'Total Districts',
          value: '0', // Will be populated when districts data is available
          change: 'School districts tracked',
          icon: School,
          color: 'purple'
        },
        {
          title: 'District Contacts',
          value: stats.totalLeads.toLocaleString(),
          change: 'Key personnel identified',
          icon: Users,
          color: 'blue'
        },
        {
          title: 'Emails Sent Today',
          value: stats.emailsSent.toLocaleString(),
          change: 'Educational outreach',
          icon: Mail,
          color: 'green'
        },
        {
          title: 'Active Campaigns',
          value: stats.totalCampaigns.toLocaleString(),
          change: 'District engagement campaigns',
          icon: Target,
          color: 'orange'
        }
      ]
    } else {
      return [
        {
          title: 'Total Leads',
          value: stats.totalLeads.toLocaleString(),
          change: `${stats.activeLeads} active prospects`,
          icon: Users,
          color: 'blue'
        },
        {
          title: 'Emails Made Today',
          value: stats.emailsSent.toLocaleString(),
          change: 'Real estate outreach',
          icon: Mail,
          color: 'green'
        },
        {
          title: 'Calls Made Today',
          value: stats.callsMade.toLocaleString(),
          change: 'Direct conversations',
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
    }
  }

  const statCards = getStatCards()

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
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

  const handleImportData = () => {
    window.location.href = '/import'
  }

  const handleViewData = () => {
    if (selectedCompany === 'Avalern') {
      window.location.href = '/districts'
    } else {
      window.location.href = '/leads'
    }
  }

  const fetchFilteredTouchpoints = async () => {
    try {
      // Build query parameters for specific date
      const params = new URLSearchParams()
      params.append('date', selectedDate)
      params.append('company', selectedCompany)
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

  const handleCalendarMonthChange = (startDate: string, endDate: string) => {
    // Fetch touchpoint counts for the new month
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    params.append('company', selectedCompany)
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
            <h1 className="text-3xl font-bold text-gray-900">{selectedCompany} Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {currentConfig.description} - Welcome back! Here's your overview.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Company Brand Bar */}
        <div className={`${currentConfig.lightColor} ${currentConfig.borderColor} border rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 ${currentConfig.primaryColor} rounded-lg flex items-center justify-center`}>
                {selectedCompany === 'Avalern' ? (
                  <School className="h-6 w-6 text-white" />
                ) : (
                  <Building className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${currentConfig.textColor}`}>{selectedCompany}</h2>
                <p className="text-sm text-gray-600">{currentConfig.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentConfig.features.map((feature, index) => (
                <span key={index} className={`px-2 py-1 text-xs rounded-full ${currentConfig.lightColor} ${currentConfig.textColor}`}>
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleImportData}
            className={`flex items-center justify-between p-6 ${currentConfig.lightColor} rounded-lg hover:opacity-80 transition-opacity border ${currentConfig.borderColor}`}
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${currentConfig.primaryColor} rounded-lg`}>
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className={`text-lg font-semibold ${currentConfig.textColor}`}>
                  {selectedCompany === 'Avalern' ? 'Import Districts' : 'Import Leads'}
                </h3>
                <p className="text-sm text-gray-700">
                  {selectedCompany === 'Avalern' ? 'Upload district and contact data' : 'Upload CSV files to add prospects'}
                </p>
              </div>
            </div>
            <span className={`${currentConfig.textColor} text-xl`}>→</span>
          </button>
          
          <button 
            onClick={handleViewData}
            className={`flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200`}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-600 rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCompany === 'Avalern' ? 'View Districts' : 'View Leads'}
                </h3>
                <p className="text-sm text-gray-700">
                  {selectedCompany === 'Avalern' ? 'Browse district database' : 'Manage your prospects'}
                </p>
              </div>
            </div>
            <span className="text-gray-600 text-xl">→</span>
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

        {/* Debug Info for Avalern */}
        {selectedCompany === 'Avalern' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Avalern Debug Info</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• Check browser console for touchpoint fetch logs</p>
              <p>• Campaigns found: {campaigns.length}</p>
              <p>• Recent contacts: {recentLeads.length}</p>
              <p>• Scheduled touchpoints: {scheduledTouchpoints.length}</p>
              <p>• To create touchpoints: Import districts → Create campaigns → Set up outreach sequences</p>
            </div>
          </div>
        )}

        {/* Touchpoint Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedCompany === 'Avalern' ? 'Filter District Outreach' : 'Filter Touchpoints'}
          </h3>
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
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCompany === 'Avalern' ? 'Scheduled District Outreach' : 'Scheduled Touchpoints'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDate ? `Scheduled for ${new Date(selectedDate).toLocaleDateString()}` : `Upcoming outreach for ${selectedCompany}`}
                </p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Total: {scheduledTouchpoints.length}</span>
                <span>Today: {scheduledTouchpoints.filter(tp => new Date(tp.scheduled_at).toDateString() === new Date().toDateString()).length}</span>
                <span>Overdue: {scheduledTouchpoints.filter(tp => new Date(tp.scheduled_at) < new Date()).length}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {scheduledTouchpoints.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No scheduled touchpoints found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {selectedCompany === 'Avalern' ? 
                    'Go to the Outreach page to create district engagement sequences' :
                    'Go to the Outreach page to create touchpoint sequences for your leads'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledTouchpoints.map((touchpoint) => {
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
                          {selectedCompany === 'Avalern' ? 'Responded' : 'Replied'}
                        </button>
                        <button
                          onClick={() => markTouchpointComplete(touchpoint.id, 'no_answer')}
                          className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                        >
                          No Response
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contacts/Leads */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedCompany === 'Avalern' ? 'Recent District Contacts' : 'Recent Leads'}
            </h3>
            <div className="space-y-4">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${currentConfig.primaryColor}`}></div>
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
                <p className="text-gray-500 text-center py-8">
                  {selectedCompany === 'Avalern' ? 'No district contacts found. Import district data to get started!' : 'No leads found. Import some leads to get started!'}
                </p>
              )}
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedCompany === 'Avalern' ? 'District Engagement Campaigns' : 'Lead Generation Campaigns'}
            </h3>
            <div className="space-y-4">
              {campaigns.length > 0 ? (
                campaigns.map((campaign, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${currentConfig.primaryColor}`}></div>
                        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {campaign.lead_count > 0 ? Math.round((campaign.conversion_count / campaign.lead_count) * 100) : 0}% success
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500">{selectedCompany === 'Avalern' ? 'Contacts' : 'Leads'}</p>
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
                        <p className="text-sm text-gray-500">{selectedCompany === 'Avalern' ? 'Engaged' : 'Conversions'}</p>
                        <p className="font-semibold text-gray-900">{campaign.conversion_count}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No campaigns found for {selectedCompany}. Create a campaign to start tracking performance.
                </p>
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
