'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
import { supabase } from '@/lib/supabase'
import {
  Target,
  Plus,
  Users,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  company: string
  status?: string
  start_date?: string
  created_at: string
  outreach_sequence_id?: string
  outreach_sequence?: {
    id: string
    name: string
    description?: string
  }
  leadCount: number
  emailsSent: number
  callsMade: number
  appointmentsBooked: number
  sales: number
  conversionRate: number
  launch_date: string
  description?: string
}

interface OutreachSequence {
  id: string
  name: string
  description?: string
  company: string
}

interface CampaignFormData {
  name: string
  company: string
  launchDate: string
  endDate: string
  outreachSequenceId: string
  description?: string
  instantlyCampaignId?: string
}

export default function CampaignsPage() {
  const { selectedCompany } = useCompany()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [outreachSequences, setOutreachSequences] = useState<OutreachSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Form data for create campaign modal
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    company: selectedCompany,
    launchDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    outreachSequenceId: '',
    description: '',
    instantlyCampaignId: ''
  })

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('campaigns')
          .select(`
            id, name, company, start_date, created_at, outreach_sequence_id,
            leads(id, status, touchpoints(type, completed_at)),
            outreach_sequence:outreach_sequences(id, name, description)
          `)
          .eq('company', selectedCompany)

        if (error) {
          console.error('Error fetching campaigns:', error)
          return
        }

        const enriched = data.map(campaign => {
          const leadCount = campaign.leads?.length || 0
          
          // Flatten touchpoints from all leads
          const allTouchpoints = campaign.leads?.flatMap((lead: any) => lead.touchpoints || []) || []
          const emailsSent = allTouchpoints.filter((tp: any) => tp.type === 'email' && tp.completed_at).length
          const callsMade = allTouchpoints.filter((tp: any) => tp.type === 'call' && tp.completed_at).length
          
          const appointmentsBooked = campaign.leads?.filter((lead: any) => lead.status === 'engaged').length || 0
          const sales = campaign.leads?.filter((lead: any) => lead.status === 'won').length || 0
          const conversionRate = leadCount > 0 ? Number(((sales / leadCount) * 100).toFixed(1)) : 0

          return {
            ...campaign,
            leadCount,
            emailsSent,
            callsMade,
            appointmentsBooked,
            sales,
            conversionRate,
            launch_date: campaign.start_date || campaign.created_at,
            status: leadCount > 0 ? 'active' : 'queued',
            outreach_sequence: Array.isArray(campaign.outreach_sequence) ? campaign.outreach_sequence[0] : campaign.outreach_sequence
          } as Campaign
        })

        setCampaigns(enriched)
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [selectedCompany])

  // Fetch outreach sequences
  useEffect(() => {
    const fetchOutreachSequences = async () => {
      try {
        const { data, error } = await supabase
          .from('outreach_sequences')
          .select('id, name, description, company')
          .eq('company', selectedCompany)

        if (error) {
          console.error('Error fetching outreach sequences:', error)
          return
        }

        setOutreachSequences(data || [])
      } catch (error) {
        console.error('Error fetching outreach sequences:', error)
      }
    }

    fetchOutreachSequences()
  }, [selectedCompany])

  // Update form company when selectedCompany changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, company: selectedCompany }))
  }, [selectedCompany])

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      queued: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || colors.queued
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      active: <Activity className="h-3 w-3" />,
      queued: <Clock className="h-3 w-3" />,
      completed: <CheckCircle className="h-3 w-3" />
    }
    return icons[status as keyof typeof icons] || icons.queued
  }

  const handleCreateCampaign = () => {
    if (!formData.name || !formData.outreachSequenceId || !formData.endDate) {
      alert('Please fill in all required fields')
      return
    }

    // Navigate to appropriate selection page based on company
    const params = new URLSearchParams({
      campaignName: formData.name,
      outreachSequenceId: formData.outreachSequenceId,
      launchDate: formData.launchDate,
      endDate: formData.endDate,
      description: formData.description || '',
      instantlyCampaignId: formData.instantlyCampaignId || ''
    })
    
    // For Avalern, go to district selection; for CraftyCode, go to lead selection
    const selectionPath = selectedCompany === 'Avalern' 
      ? '/campaigns/select-districts' 
      : '/campaigns/select-leads'
    
    window.location.href = `${selectionPath}?${params.toString()}`
  }

  const handleViewCampaign = (campaign: Campaign) => {
    window.location.href = `/campaigns/${campaign.id}`
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedStatus === 'all') return true
    return campaign.status === selectedStatus
  })

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
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-1">
              Manage your outreach campaigns for {selectedCompany}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                {['active', 'queued', 'completed'].map(status => (
                  <option key={status} value={status} className="capitalize">{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              onClick={() => handleViewCampaign(campaign)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${campaign.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                    <span className="text-sm text-gray-600">{campaign.company}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status || 'queued')}`}>
                      {getStatusIcon(campaign.status || 'queued')}
                      <span className="ml-1 capitalize">{campaign.status || 'queued'}</span>
                    </span>
                  </div>
                  {/* Sequence Used Tag */}
                  {campaign.outreach_sequence && (
                    <div className="inline-flex items-center px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                      <Target className="h-3 w-3 mr-1" />
                      {campaign.outreach_sequence.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Leads
                  </span>
                  <span className="font-semibold">{campaign.leadCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    Emails Sent
                  </span>
                  <span className="font-semibold">{campaign.emailsSent}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    Calls Made
                  </span>
                  <span className="font-semibold">{campaign.callsMade}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Engaged Leads
                  </span>
                  <span className="font-semibold text-blue-600">{campaign.appointmentsBooked}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sales
                  </span>
                  <span className="font-semibold text-green-600">{campaign.sales}</span>
                </div>
              </div>

              {/* Conversion Rate */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="text-lg font-bold text-gray-900">{campaign.conversionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(campaign.conversionRate, 10) * 10}%` }}
                  ></div>
                </div>
              </div>

              {/* Dates */}
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Launch: {new Date(campaign.launch_date).toLocaleDateString()}
                </div>
                <div>
                  Created: {new Date(campaign.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-500 mb-4">
              {selectedStatus !== 'all' 
                ? `No ${selectedStatus} campaigns found for ${selectedCompany}.`
                : `No campaigns found for ${selectedCompany}. Get started by creating your first campaign.`
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedCompany} Campaign Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredCampaigns.length}</p>
              <p className="text-sm text-gray-600">Total Campaigns</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredCampaigns.filter(c => c.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {filteredCampaigns.reduce((sum, c) => sum + c.leadCount, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Leads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {filteredCampaigns.reduce((sum, c) => sum + c.sales, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create New Campaign</h3>
                  <p className="text-sm text-gray-500">Set up your outreach campaign with automated touchpoints</p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    placeholder="Enter campaign name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${selectedCompany === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      {selectedCompany}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Campaign will be created for the currently selected company</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Launch Date</label>
                  <input
                    type="date"
                    value={formData.launchDate}
                    onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.launchDate}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outreach Sequence *</label>
                  <select
                    value={formData.outreachSequenceId}
                    onChange={(e) => setFormData({ ...formData, outreachSequenceId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="">Select an outreach sequence...</option>
                    {outreachSequences.map(sequence => (
                      <option key={sequence.id} value={sequence.id}>
                        {sequence.name} {sequence.description && `- ${sequence.description}`}
                      </option>
                    ))}
                  </select>
                  {outreachSequences.length === 0 && (
                    <p className="text-xs text-red-500 mt-2 flex items-center">
                      <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                      No outreach sequences available for {selectedCompany}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors resize-none"
                    placeholder="Optional campaign description..."
                  />
                </div>
                
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instantly.ai Campaign ID
                    <span className="text-gray-500 text-xs ml-1">(Optional - for email sync integration)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.instantlyCampaignId}
                    onChange={(e) => setFormData({ ...formData, instantlyCampaignId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    placeholder="Enter your Instantly.ai campaign ID..."
                  />
                </div> */}
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCampaign}
                  disabled={creating || !formData.name || !formData.outreachSequenceId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all flex items-center"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Continue to {selectedCompany === 'Avalern' ? 'District' : 'Lead'} Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 