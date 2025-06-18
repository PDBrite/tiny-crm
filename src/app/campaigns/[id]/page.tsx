'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
import { supabase } from '@/lib/supabase'
import {
  Target,
  Calendar,
  Users,
  Mail,
  Phone,
  TrendingUp,
  Edit2,
  ArrowLeft,
  CheckCircle,
  Plus,
  Minus,
  User,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  company: string
  status?: string
  start_date?: string
  end_date?: string
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
  instantly_campaign_id?: string
}

interface OutreachSequence {
  id: string
  name: string
  description?: string
  company: string
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [outreachSequences, setOutreachSequences] = useState<OutreachSequence[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'touchpoints'>('overview')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Lead management
  const [campaignLeads, setCampaignLeads] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<any | null>(null)
  const [editingLeadData, setEditingLeadData] = useState<any | null>(null)
  const [updatingLead, setUpdatingLead] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Touchpoints
  const [campaignTouchpoints, setCampaignTouchpoints] = useState<any[]>([])
  const [loadingTouchpoints, setLoadingTouchpoints] = useState(false)
  
  // Touchpoints filters and pagination
  const [touchpointTypeFilter, setTouchpointTypeFilter] = useState('')
  const [touchpointDateFromFilter, setTouchpointDateFromFilter] = useState('')
  const [touchpointDateToFilter, setTouchpointDateToFilter] = useState('')
  const [touchpointOutcomeFilter, setTouchpointOutcomeFilter] = useState('')
  const [touchpointCurrentPage, setTouchpointCurrentPage] = useState(1)
  const [touchpointItemsPerPage] = useState(10)
  const [filteredCampaignTouchpoints, setFilteredCampaignTouchpoints] = useState<any[]>([])
  
  // Sequence steps
  const [sequenceSteps, setSequenceSteps] = useState<any[]>([])
  const [loadingSequenceSteps, setLoadingSequenceSteps] = useState(false)

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    name: '',
    company: selectedCompany,
    start_date: '',
    end_date: '',
    description: '',
    instantly_campaign_id: ''
  })

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
      fetchOutreachSequences()
      fetchCampaignLeads()
      fetchCampaignTouchpoints()
    }
  }, [campaignId, selectedCompany])

  const fetchSequenceSteps = async (sequenceId: string) => {
    if (!sequenceId) return
    
    setLoadingSequenceSteps(true)
    try {
      const { data, error } = await supabase
        .from('outreach_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true })

      if (error) {
        console.error('Error fetching sequence steps:', error)
      } else {
        setSequenceSteps(data || [])
      }
    } catch (error) {
      console.error('Error fetching sequence steps:', error)
    } finally {
      setLoadingSequenceSteps(false)
    }
  }

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id, name, company, start_date, end_date, created_at, outreach_sequence_id, description, instantly_campaign_id,
          leads(id, status, touchpoints(type, completed_at)),
          outreach_sequence:outreach_sequences(id, name, description)
        `)
        .eq('id', campaignId)
        .single()

      if (error) {
        console.error('Error fetching campaign:', error)
        return
      }

      if (data) {
        const leadCount = data.leads?.length || 0
        const allTouchpoints = data.leads?.flatMap((lead: any) => lead.touchpoints || []) || []
        const emailsSent = allTouchpoints.filter((tp: any) => tp.type === 'email' && tp.completed_at).length
        const callsMade = allTouchpoints.filter((tp: any) => tp.type === 'call' && tp.completed_at).length
        const appointmentsBooked = data.leads?.filter((lead: any) => lead.status === 'booked').length || 0
        const sales = data.leads?.filter((lead: any) => lead.status === 'won').length || 0
        const conversionRate = leadCount > 0 ? Number(((sales / leadCount) * 100).toFixed(1)) : 0

        const enrichedCampaign = {
          ...data,
          leadCount,
          emailsSent,
          callsMade,
          appointmentsBooked,
          sales,
          conversionRate,
          launch_date: data.start_date || data.created_at,
          status: leadCount > 0 ? 'active' : 'queued',
          outreach_sequence: Array.isArray(data.outreach_sequence) ? data.outreach_sequence[0] : data.outreach_sequence
        } as Campaign

        setCampaign(enrichedCampaign)
        setEditFormData({
          name: data.name,
          company: data.company,
          start_date: data.start_date || data.created_at.split('T')[0],
          end_date: data.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: data.description || '',
          instantly_campaign_id: data.instantly_campaign_id || ''
        })
        
        // Fetch sequence steps if there's an outreach sequence
        if (data.outreach_sequence_id) {
          fetchSequenceSteps(data.outreach_sequence_id)
        }
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const fetchCampaignLeads = async () => {
    setLoadingLeads(true)
    try {
      // First, try to fetch leads with contact attempts
      let { data: currentLeads, error: currentError } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, email, status, city, state, company, 
          phone, linkedin_url, website_url, online_profile, source
        `)
        .eq('campaign_id', campaignId)

      if (currentError) {
        console.error('Error fetching campaign leads:', currentError)
        return
      }

      // Try to fetch contact attempts separately to avoid relation errors
      const leadIds = currentLeads?.map(lead => lead.id) || []
      let contactAttemptsData: any[] = []
      
      if (leadIds.length > 0) {
        const { data: attempts, error: attemptsError } = await supabase
          .from('contact_attempts')
          .select('lead_id, type, completed_at, notes')
          .in('lead_id', leadIds)

        if (attemptsError) {
          console.warn('Contact attempts table not found or accessible, using default values:', attemptsError)
        } else {
          contactAttemptsData = attempts || []
        }
      }

      // Process leads to add contact attempt counts and last contact date
      const processedLeads = (currentLeads || []).map(lead => {
        const leadAttempts = contactAttemptsData.filter(attempt => attempt.lead_id === lead.id)
        const lastAttempt = leadAttempts.length > 0 
          ? leadAttempts.sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
          : null

        return {
          ...lead,
          contact_attempts_count: leadAttempts.length,
          last_contacted_at: lastAttempt?.completed_at || null
        }
      })

      setCampaignLeads(processedLeads)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const fetchCampaignTouchpoints = async () => {
    setLoadingTouchpoints(true)
    try {
      const { data: touchpoints, error } = await supabase
        .from('touchpoints')
        .select(`
          *,
          lead:leads!inner(
            id,
            first_name,
            last_name,
            email,
            campaign_id
          )
        `)
        .eq('lead.campaign_id', campaignId)
        .order('scheduled_at', { ascending: true })

      if (error) {
        console.error('Error fetching campaign touchpoints:', error)
      } else {
        setCampaignTouchpoints(touchpoints || [])
      }
    } catch (error) {
      console.error('Error fetching campaign touchpoints:', error)
    } finally {
      setLoadingTouchpoints(false)
    }
  }

  const handleUpdateCampaign = async () => {
    if (!campaign || !editFormData.name || !editFormData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          name: editFormData.name,
          company: editFormData.company,
          description: editFormData.description,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          instantly_campaign_id: editFormData.instantly_campaign_id
        })
        .eq('id', campaign.id)

      if (error) {
        console.error('Error updating campaign:', error)
        alert('Failed to update campaign')
        return
      }

      alert('Campaign updated successfully!')
      setIsEditing(false)
      fetchCampaign() // Refresh campaign data
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Failed to update campaign')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveLeadFromCampaign = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ campaign_id: null })
        .eq('id', leadId)

      if (error) {
        console.error('Error removing lead from campaign:', error)
        alert('Failed to remove lead from campaign')
        return
      }

      fetchCampaignLeads()
      fetchCampaign() // Refresh campaign stats
    } catch (error) {
      console.error('Error removing lead from campaign:', error)
      alert('Failed to remove lead from campaign')
    }
  }

  const handleOpenLeadEditPanel = (lead: any) => {
    setSelectedLeadForEdit(lead)
    setEditingLeadData({ ...lead })
  }

  const handleCloseLeadEditPanel = () => {
    setSelectedLeadForEdit(null)
    setEditingLeadData(null)
  }

  const handleUpdateLeadInCampaign = async () => {
    if (!editingLeadData || !selectedLeadForEdit) return

    setUpdatingLead(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          first_name: editingLeadData.first_name,
          last_name: editingLeadData.last_name,
          email: editingLeadData.email,
          phone: editingLeadData.phone,
          city: editingLeadData.city,
          state: editingLeadData.state,
          company: editingLeadData.company,
          status: editingLeadData.status,
          source: editingLeadData.source,
          linkedin_url: editingLeadData.linkedin_url,
          website_url: editingLeadData.website_url
        })
        .eq('id', selectedLeadForEdit.id)

      if (error) {
        console.error('Error updating lead:', error)
        alert('Failed to update lead')
        return
      }

      alert('Lead updated successfully!')
      handleCloseLeadEditPanel()
      fetchCampaignLeads() // Refresh leads
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    } finally {
      setUpdatingLead(false)
    }
  }

  const handleDeleteCampaign = async () => {
    if (!campaign) return

    setDeleting(true)
    try {
      // First, remove campaign assignment from all leads
      const { error: leadsError } = await supabase
        .from('leads')
        .update({ campaign_id: null })
        .eq('campaign_id', campaign.id)

      if (leadsError) {
        console.error('Error updating leads:', leadsError)
        alert('Failed to update leads before deleting campaign')
        return
      }

      // Then delete the campaign
      const { error: campaignError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id)

      if (campaignError) {
        console.error('Error deleting campaign:', campaignError)
        alert('Failed to delete campaign')
        return
      }

      alert('Campaign deleted successfully!')
      // Navigate back to campaigns page
      window.location.href = '/campaigns'
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Failed to delete campaign')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'queued': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || colors['queued']
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Target className="h-4 w-4" />
      case 'queued':
        return <Calendar className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
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

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign not found</h3>
          <button
            onClick={() => router.push('/campaigns')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Campaigns
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Campaigns
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${campaign.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                  <span className="text-sm font-medium text-gray-600">{campaign.company}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status || 'queued')}`}>
                  {getStatusIcon(campaign.status || 'queued')}
                  <span className="ml-1 capitalize">{campaign.status || 'queued'}</span>
                </span>
              </div>
              {campaign.description && (
                <p className="text-gray-600 mt-2">{campaign.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCampaign}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Campaign
                </button>
              </>
            )}
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.leadCount}</p>
                <p className="text-sm text-gray-600">Leads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.emailsSent}</p>
                <p className="text-sm text-gray-600">Emails Sent</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.callsMade}</p>
                <p className="text-sm text-gray-600">Calls Made</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.appointmentsBooked}</p>
                <p className="text-sm text-gray-600">Appointments</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.sales}</p>
                <p className="text-sm text-gray-600">Sales</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.conversionRate}%</p>
                <p className="text-sm text-gray-600">Conversion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Campaign Overview
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'leads'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lead Management ({campaignLeads.length})
          </button>
          <button
            onClick={() => setActiveTab('touchpoints')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'touchpoints'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Touchpoint Schedule ({campaignTouchpoints.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Campaign Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Campaign Details</h3>
              
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                      placeholder="Enter campaign name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={editFormData.start_date}
                      onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={editFormData.end_date}
                      onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                      min={editFormData.start_date}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors resize-none"
                      placeholder="Optional campaign description..."
                    />
                  </div>
                  
                  {/* <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instantly.ai Campaign ID
                      <span className="text-gray-500 text-xs ml-1">(Optional - for email sync integration)</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.instantly_campaign_id}
                      onChange={(e) => setEditFormData({ ...editFormData, instantly_campaign_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                      placeholder="Enter your Instantly.ai campaign ID..."
                    />
                  </div> */}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Campaign Name</h4>
                    <p className="text-gray-900">{campaign.name}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Company</h4>
                    <p className="text-gray-900">{campaign.company}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Start Date</h4>
                    <p className="text-gray-900">
                      {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">End Date</h4>
                    <p className="text-gray-900">
                      {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Created</h4>
                    <p className="text-gray-900">{new Date(campaign.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Outreach Sequence</h4>
                    <p className="text-gray-900">
                      {campaign.outreach_sequence ? campaign.outreach_sequence.name : 'No sequence assigned'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Instantly.ai Campaign ID</h4>
                    <p className="text-gray-900">
                      {campaign.instantly_campaign_id || 'Not configured'}
                    </p>
                  </div>
                  
                  {campaign.description && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-gray-900">{campaign.description}</p>
                    </div>
                  )}
                  
                  {/* Touchpoint Sequence Pattern */}
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Touchpoint Sequence Pattern</h4>
                    {campaign.outreach_sequence ? (
                      loadingSequenceSteps ? (
                        <div className="flex items-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-gray-500 text-sm">Loading sequence...</span>
                        </div>
                      ) : sequenceSteps.length === 0 ? (
                        <p className="text-gray-500 italic">No steps defined in sequence</p>
                      ) : (
                        <div className="space-y-2">
                          {sequenceSteps.map((step, index) => {
                            const startDate = new Date(campaign.start_date || campaign.created_at)
                            const stepDate = new Date(startDate)
                            stepDate.setDate(startDate.getDate() + (step.day_offset || 0))
                            
                            return (
                              <div key={step.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-600 w-8">
                                  {step.step_order}.
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  step.type === 'email' ? 'bg-blue-100 text-blue-800' :
                                  step.type === 'call' ? 'bg-green-100 text-green-800' :
                                  step.type === 'linkedin_message' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {step.type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-600">
                                  on {stepDate.toLocaleDateString()}
                                </span>
                                {step.day_offset > 0 && (
                                  <span className="text-xs text-gray-500">
                                    (+{step.day_offset} days)
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    ) : (
                      <p className="text-gray-500 italic">No outreach sequence assigned</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lead Management Tab */}
          {activeTab === 'leads' && (
            <div className="p-6">
              {loadingLeads ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading leads...</p>
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* Main Leads Table */}
                  <div className={`transition-all duration-300 ${selectedLeadForEdit ? 'w-1/2' : 'w-full'}`}>
                    <div className="space-y-6">
                      {/* Campaign Leads Table */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Campaign Leads ({campaignLeads.length})
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Attempts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {campaignLeads.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No leads assigned to this campaign
                                  </td>
                                </tr>
                              ) : (
                                campaignLeads.map((lead) => (
                                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenLeadEditPanel(lead)}>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                          <User className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {lead.first_name} {lead.last_name}
                                          </div>
                                          <div className="text-sm text-gray-500">{lead.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        lead.status === 'not_contacted' ? 'bg-gray-100 text-gray-800' :
                                        lead.status === 'actively_contacting' ? 'bg-blue-100 text-blue-800' :
                                        lead.status === 'engaged' ? 'bg-green-100 text-green-800' :
                                        lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                                        lead.status === 'not_interested' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {lead.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">
                                        {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.city || lead.state || 'N/A'}
                                      </div>
                                      <div className="text-sm">
                                        {lead.online_profile ? (
                                          <a 
                                            href={lead.online_profile} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            View Profile
                                          </a>
                                        ) : lead.linkedin_url ? (
                                          <a 
                                            href={lead.linkedin_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            LinkedIn
                                          </a>
                                        ) : (
                                          <span className="text-gray-500">{lead.source || 'Unknown'}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center text-sm text-gray-900">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {lead.contact_attempts_count || 0} attempts
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center text-sm text-gray-900">
                                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                                        {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleRemoveLeadFromCampaign(lead.id)}
                                        className="flex items-center text-red-600 hover:text-red-800 text-sm font-medium"
                                      >
                                        <Minus className="h-4 w-4 mr-1" />
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Lead Edit Panel */}
                  {selectedLeadForEdit && editingLeadData && (
                    <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold text-gray-900">
                            Edit {selectedLeadForEdit.first_name} {selectedLeadForEdit.last_name}
                          </h2>
                          <button
                            onClick={handleCloseLeadEditPanel}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-6 w-6" />
                          </button>
                        </div>
                      </div>

                      <div className="px-6 py-4 space-y-6 max-h-[80vh] overflow-y-auto">
                        {/* Basic Information */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">Basic Information</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                              <input
                                type="text"
                                value={editingLeadData.first_name || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, first_name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={editingLeadData.last_name || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, last_name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input
                                type="email"
                                value={editingLeadData.email || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, email: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <input
                                type="tel"
                                value={editingLeadData.phone || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Location & Company */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">Location & Company</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                              <input
                                type="text"
                                value={editingLeadData.city || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, city: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                              <input
                                type="text"
                                value={editingLeadData.state || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, state: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                              <input
                                type="text"
                                value={editingLeadData.company || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, company: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Status & Source */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">Status & Source</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                              <select
                                value={editingLeadData.status || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, status: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="not_contacted">Not Contacted</option>
                                <option value="actively_contacting">Actively Contacting</option>
                                <option value="engaged">Engaged</option>
                                <option value="won">Won</option>
                                <option value="not_interested">Not Interested</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                              <select
                                value={editingLeadData.source || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, source: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="Zillow">Zillow</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Realtor.com">Realtor.com</option>
                                <option value="Redfin">Redfin</option>
                                <option value="Trulia">Trulia</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* URLs */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">URLs & Links</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                              <input
                                type="url"
                                value={editingLeadData.linkedin_url || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, linkedin_url: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                              <input
                                type="url"
                                value={editingLeadData.website_url || ''}
                                onChange={(e) => setEditingLeadData({...editingLeadData, website_url: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                          <button
                            onClick={handleCloseLeadEditPanel}
                            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateLeadInCampaign}
                            disabled={updatingLead}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {updatingLead ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Touchpoints Tab */}
          {activeTab === 'touchpoints' && (
            <div className="p-6">
              <div className="space-y-6">
                {/* Touchpoints List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Campaign Touchpoints</h3>
                  </div>
                  <div className="p-6">
                    {campaignTouchpoints.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No touchpoints found for this campaign</p>
                    ) : (
                      <div className="space-y-4">
                        {campaignTouchpoints.map((touchpoint) => (
                          <div 
                            key={touchpoint.id} 
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                              </div>
                              {touchpoint.subject && (
                                <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-1">
                                {touchpoint.lead?.email && (
                                  <p className="text-xs text-gray-500">{touchpoint.lead.email}</p>
                                )}
                                {touchpoint.scheduled_at && (
                                  <p className="text-xs text-gray-500">
                                    Scheduled: {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                                  </p>
                                )}
                                {touchpoint.completed_at && (
                                  <p className="text-xs text-gray-500">
                                    Completed: {new Date(touchpoint.completed_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {touchpoint.outcome && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Outcome:</span> {touchpoint.outcome}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Campaign</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <strong>"{campaign?.name}"</strong>? 
                  This will remove the campaign and unassign all leads from it.
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCampaign}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 