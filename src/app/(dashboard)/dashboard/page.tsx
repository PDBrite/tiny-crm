'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import type { Campaign, Lead, Touchpoint } from '@/types/database'
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
import { getCurrentDateString, formatDateToLocalString } from '@/utils/date-utils'

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
  // Default to Avalern if selectedCompany is not set
  const effectiveCompany = selectedCompany || 'Avalern'
  
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
  const [selectedDate, setSelectedDate] = useState(getCurrentDateString())
  const [selectedType, setSelectedType] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const touchpointsPerPage = 20

  // Company-specific configurations (keys correspond to CompanyType values)
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

  const currentConfig = companyConfig[effectiveCompany as keyof typeof companyConfig] || companyConfig.Avalern

  // Fetch dashboard data using API endpoints
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch campaigns for selected company
        const campaignsResponse = await fetch(`/api/campaigns?company=${effectiveCompany}`)
        if (!campaignsResponse.ok) {
          console.error('Error fetching campaigns:', campaignsResponse.status)
          return
        }
        const campaignsData = await campaignsResponse.json()
        const campaigns = campaignsData.campaigns || []

        // Fetch leads for selected company campaigns
        const campaignIds = campaigns?.map((c: any) => c.id) || []
        
        let leadsData: any[] = []
        if (campaignIds.length > 0 && effectiveCompany === 'CraftyCode') {
          try {
            const leadsResponse = await fetch(`/api/campaign-leads?company=${effectiveCompany}`)
            if (leadsResponse.ok) {
              const leadsResult = await leadsResponse.json()
              leadsData = leadsResult.leads || []
            } else {
              console.error('Error fetching leads:', leadsResponse.status)
            }
          } catch (error) {
            console.error('Error fetching leads data:', error)
          }
        }

        // For Avalern, also fetch district data
        let districtsData: any[] = []
        let districtContactsData: any[] = []
        if (effectiveCompany === 'Avalern') {
          try {
            // Fetch districts from API endpoint
            const districtsResponse = await fetch('/api/districts')
            if (districtsResponse.ok) {
              const districtsResult = await districtsResponse.json()
              districtsData = districtsResult.districts || []
              
              // Calculate total contacts from district data
              const totalContacts = districtsData.reduce((sum, district) => sum + (district.contacts_count || 0), 0)
              districtContactsData = new Array(totalContacts)
            } else {
              console.error('Error fetching districts from API:', districtsResponse.status)
            }
          } catch (error) {
            console.error('Error fetching district data:', error)
          }
        }

        // Calculate stats - focus on today's activities
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        
        // Calculate email and call counts from touchpoints
        let emailsSentToday = 0;
        let callsMadeToday = 0;
        let activeLeads = 0;
        let conversions = 0;
        let totalLeads = 0;

        if (effectiveCompany === 'CraftyCode') {
          // For CraftyCode, use the enriched leads data
          totalLeads = leadsData?.length || 0;
          activeLeads = leadsData?.filter(l => !['won', 'lost'].includes(l.status)).length || 0;
          conversions = leadsData?.filter(l => l.status === 'won').length || 0;
          
          // Fetch today's touchpoints for email and call counts
          try {
            const todayDateString = formatDateToLocalString(todayStart);
            const touchpointsResponse = await fetch(`/api/touchpoint-counts?date=${todayDateString}&company=${effectiveCompany}`);
            if (touchpointsResponse.ok) {
              const touchpointsResult = await touchpointsResponse.json();
              emailsSentToday = touchpointsResult.counts?.email || 0;
              callsMadeToday = touchpointsResult.counts?.call || 0;
            } else {
              console.error('Error fetching today\'s touchpoints:', touchpointsResponse.status);
            }
          } catch (error) {
            console.error('Error fetching today\'s touchpoints:', error);
          }
        } else {
          // For Avalern, use the district data
          // Calculate email and call counts from touchpoints
          try {
            const todayDateString = formatDateToLocalString(todayStart);
            const touchpointsResponse = await fetch(`/api/touchpoint-counts?date=${todayDateString}&company=${effectiveCompany}`);
            if (touchpointsResponse.ok) {
              const touchpointsResult = await touchpointsResponse.json();
              emailsSentToday = touchpointsResult.counts?.email || 0;
              callsMadeToday = touchpointsResult.counts?.call || 0;
            } else {
              console.error('Error fetching today\'s touchpoints:', touchpointsResponse.status);
            }
          } catch (error) {
            console.error('Error fetching today\'s touchpoints:', error);
          }
        }

        setStats({
          totalLeads: totalLeads,
          emailsSent: emailsSentToday,
          callsMade: callsMadeToday,
          conversions: conversions,
          activeLeads: activeLeads,
          totalCampaigns: campaigns?.length || 0,
          totalDistricts: districtsData?.length || 0,
          districtContacts: effectiveCompany === 'Avalern' ? districtContactsData?.length || 0 : 0
        })

        // Calculate campaign stats
        const campaignStats: CampaignStats[] = campaigns?.map((campaign: any) => {
          if (effectiveCompany === 'CraftyCode') {
            // For CraftyCode, use the enriched leads data
            const campaignLeads = leadsData?.filter(l => l.campaign_id === campaign.id) || []
            return {
              ...campaign,
              lead_count: campaignLeads.length,
              email_count: campaignLeads.reduce((sum, lead) => sum + (lead.touchpoints_count || 0), 0),
              call_count: 0, // We don't have this data readily available
              conversion_count: campaignLeads.filter(l => l.status === 'won').length
            }
          } else {
            // For Avalern, calculate from district data
            const campaignDistricts = districtsData?.filter(d => d.campaign_id === campaign.id) || []
            const contactCount = campaignDistricts.reduce((sum, district) => sum + (district.contacts_count || 0), 0)
            return {
              ...campaign,
              lead_count: contactCount,
              email_count: 0, // We don't have this data readily available
              call_count: 0, // We don't have this data readily available
              conversion_count: campaignDistricts.filter(d => d.status === 'won').length
            }
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

    if (effectiveCompany) {
      fetchDashboardData()
    }
  }, [effectiveCompany])

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
    if (effectiveCompany === 'Avalern') {
      return [
        {
          title: 'Total Districts',
          value: stats.totalDistricts?.toLocaleString() || '0',
          change: 'School districts tracked',
          icon: School,
          color: 'purple'
        },
        {
          title: 'District Contacts',
          value: stats.districtContacts?.toLocaleString() || '0',
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
          change: `${effectiveCompany} campaigns`,
          icon: Target,
          color: 'purple'
        }
      ]
    }
  }

  const statCards = getStatCards()

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    }
    return colors[color] || colors.blue
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
    const colors: Record<string, string> = {
      'not_contacted': 'bg-gray-100 text-gray-800',
      'emailed': 'bg-blue-100 text-blue-800',
      'warm': 'bg-orange-100 text-orange-800',
      'called': 'bg-purple-100 text-purple-800',
      'booked': 'bg-green-100 text-green-800',
      'won': 'bg-emerald-100 text-emerald-800',
      'lost': 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.not_contacted
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'not_contacted': 'Not Contacted',
      'emailed': 'Emailed',
      'warm': 'Warm',
      'called': 'Called',
      'booked': 'Booked',
      'won': 'Won',
      'lost': 'Lost'
    }
    return labels[status] || status
  }

  const handleImportData = () => {
    window.location.href = '/import'
  }

  const handleViewData = () => {
    if (effectiveCompany === 'Avalern') {
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
      params.append('company', effectiveCompany)
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
      params.append('startDate', formatDateToLocalString(startOfMonth))
      params.append('endDate', formatDateToLocalString(endOfMonth))
      params.append('company', effectiveCompany)
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
    params.append('company', effectiveCompany)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{effectiveCompany} Dashboard</h1>
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
              {effectiveCompany === 'Avalern' ? (
                <School className="h-6 w-6 text-white" />
              ) : (
                <Building className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${currentConfig.textColor}`}>{effectiveCompany}</h2>
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
                {effectiveCompany === 'Avalern' ? 'Import Districts' : 'Import Leads'}
              </h3>
              <p className="text-sm text-gray-700">
                {effectiveCompany === 'Avalern' ? 'Upload district and contact data' : 'Upload CSV files to add prospects'}
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
                {effectiveCompany === 'Avalern' ? 'View Districts' : 'View Leads'}
              </h3>
              <p className="text-sm text-gray-700">
                {effectiveCompany === 'Avalern' ? 'Browse district database' : 'Manage your prospects'}
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

      {/* Touchpoint Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {effectiveCompany === 'Avalern' ? 'Filter District Outreach' : 'Filter Touchpoints'}
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

      {/* Calendar Popup */}
      {showCalendarPopup && (
        <CalendarPopup
          isOpen={showCalendarPopup}
          onClose={() => setShowCalendarPopup(false)}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          touchpointCounts={touchpointCounts}
          onMonthChange={handleCalendarMonthChange}
        />
      )}
    </div>
  )
} 