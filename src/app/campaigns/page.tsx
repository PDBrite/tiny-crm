'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
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
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  List
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
  linkedinMessages?: number
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
  const [selectedSequenceSteps, setSelectedSequenceSteps] = useState<Array<{
    id: string;
    step_order: number;
    type: string;
    content_link: string;
    day_offset: number;
    sequence_id: string;
  }>>([])
  const [fetchingSteps, setFetchingSteps] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
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
      if (!selectedCompany) {
        // console.log('No company selected, skipping campaigns fetch')
        setCampaigns([])
        setLoading(false)
        return
      }
      
      setLoading(true)
      
      try {
        // Fetch campaigns with different data models based on company
        let campaignsData
        
        // Fetch campaigns with basic data first (no joins)
        // console.log('Fetching campaigns for company:', selectedCompany)
        const { data: basicCampaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, name, company, start_date, created_at, outreach_sequence_id, status')
          .eq('company', selectedCompany)

        if (campaignsError) {
          // console.error('Error fetching campaigns:', campaignsError.message || campaignsError)
          setCampaigns([])
          setLoading(false)
          return
        }

        // Fetch outreach sequences for all campaigns
        let allSequences: any[] = []
        try {
          const { data: outreachSequences, error } = await supabase
            .from('outreach_sequences')
            .select('id, name, description')

          if (error) {
            // console.warn('Could not fetch outreach sequences:', error)
            allSequences = []
          } else {
            allSequences = outreachSequences || []
          }
        } catch (error) {
          // console.warn('Error fetching outreach sequences, using empty array:', error)
          setOutreachSequences([])
        }

        // Now fetch related data separately to avoid complex join issues
        campaignsData = []
        // console.log('Processing campaigns:', basicCampaigns?.length || 0)
        
        for (const campaign of basicCampaigns || []) {
          let campaignWithData = { ...campaign }
          
          // Add outreach sequence info
          const outreachSequence = allSequences.find(seq => seq.id === campaign.outreach_sequence_id)
          if (outreachSequence) {
            (campaignWithData as any).outreach_sequence = outreachSequence
          }
          
          if (selectedCompany === 'Avalern') {
            // For Avalern: Fetch district_leads using the API endpoint
            try {
              // Use the API endpoint to fetch district leads for this campaign
              const districtsResponse = await fetch(`/api/campaign-districts?campaign_id=${campaign.id}`);
              
              if (!districtsResponse.ok) {
                // If API fails, set empty array
                (campaignWithData as any).district_leads = [];
              } else {
                const districtsData = await districtsResponse.json();
                const districts = districtsData.districts || [];
                
                // Just store the districts, we'll count them later
                (campaignWithData as any).district_leads = districts;
              }
              
              // Now fetch touchpoints for this campaign using the campaign-touchpoints API
              const touchpointsResponse = await fetch(`/api/campaign-touchpoints?campaign_id=${campaign.id}`);
              if (touchpointsResponse.ok) {
                const touchpointsData = await touchpointsResponse.json();
                (campaignWithData as any).touchpoints = touchpointsData.touchpoints || [];
                console.log(`Campaign ${campaign.name} has ${touchpointsData.touchpoints?.length || 0} touchpoints`);
              } else {
                (campaignWithData as any).touchpoints = [];
              }
            } catch (error) {
              // Skip logging to avoid type issues
              (campaignWithData as any).district_leads = [];
              (campaignWithData as any).touchpoints = [];
            }
          } else {
            // For CraftyCode: Fetch regular leads
            try {
              const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select('id, status')
                .eq('campaign_id', campaign.id)

              if (leadsError) {
                // console.warn('Error fetching leads for campaign', campaign.id, ':', leadsError)
                (campaignWithData as any).leads = []
              } else if (leads) {
                // Fetch touchpoints for leads
                const leadIds = leads.map(l => l.id)
                let touchpoints: any[] = []
                
                if (leadIds.length > 0) {
                  const { data: tps, error: tpError } = await supabase
                    .from('touchpoints')
                    .select('type, completed_at, outcome, lead_id')
                    .in('lead_id', leadIds)

                  if (tpError) {
                    // console.warn('Error fetching lead touchpoints:', tpError)
                  } else if (tps) {
                    touchpoints = tps
                  }
                }

                // Attach data to campaign
                (campaignWithData as any).leads = leads.map(lead => ({
                  ...lead,
                  touchpoints: touchpoints.filter(tp => tp.lead_id === lead.id)
                }))
              } else {
                (campaignWithData as any).leads = []
              }
            } catch (error) {
              // console.warn('Error in CraftyCode data fetching:', error)
              (campaignWithData as any).leads = []
            }
          }
          
          campaignsData.push(campaignWithData)
        }

        // console.log('Enriching campaign data for', campaignsData.length, 'campaigns')
        const enriched = campaignsData.map(campaign => {
          // console.log('Processing campaign:', campaign.name, 'for company:', selectedCompany)
          let leadCount = 0
          let allTouchpoints: any[] = []
          let engagedCount = 0
          let wonCount = 0

          if (selectedCompany === 'Avalern') {
            // Handle district_leads data structure
            const districtLeads = (campaign as any).district_leads || []
            leadCount = districtLeads.length // This correctly counts district leads
            
            // Get touchpoints from the campaign-touchpoints API response
            const touchpoints = (campaign as any).touchpoints || []
            allTouchpoints = touchpoints
            
            // Calculate engagement stats
            engagedCount = districtLeads.filter((dl: any) => dl.status === 'engaged').length || 0
            wonCount = districtLeads.filter((dl: any) => dl.status === 'won').length || 0
          } else {
            // Handle regular leads data structure
            const leads = (campaign as any).leads || []
            leadCount = leads.length
            
            // Flatten touchpoints from all leads
            allTouchpoints = leads.flatMap((lead: any) => lead.touchpoints || [])
            
            engagedCount = leads.filter((lead: any) => lead.status === 'engaged').length
            wonCount = leads.filter((lead: any) => lead.status === 'won').length
          }
          
          // Calculate touchpoint stats based on company type
          let emailsSent = 0;
          let callsMade = 0;
          let linkedinMessages = 0;
          
          // Calculate touchpoint stats from allTouchpoints
          emailsSent = allTouchpoints.filter((tp: any) => tp.type === 'email' && tp.completed_at).length;
          callsMade = allTouchpoints.filter((tp: any) => tp.type === 'call' && tp.completed_at).length;
          linkedinMessages = allTouchpoints.filter((tp: any) => tp.type === 'linkedin_message' && tp.completed_at).length;
          
          const conversionRate = leadCount > 0 ? Number(((wonCount / leadCount) * 100).toFixed(1)) : 0

          return {
            ...campaign,
            leadCount,
            emailsSent,
            callsMade,
            linkedinMessages,
            appointmentsBooked: engagedCount,
            sales: wonCount,
            conversionRate,
            launch_date: campaign.start_date || campaign.created_at,
            status: (campaign as any).status === 'complete' ? 'complete' : 'active',
            outreach_sequence: (campaign as any).outreach_sequence || null
          } as Campaign
        })

        setCampaigns(enriched)
      } catch (error) {
        // console.error('Error fetching campaigns:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [selectedCompany])

  // Fetch outreach sequences
  useEffect(() => {
    const fetchOutreachSequences = async () => {
      if (!selectedCompany) {
        // console.log('No company selected, skipping outreach sequences fetch')
        return
      }
      
      try {
        // Check if outreach_sequences table exists
        const { data, error } = await supabase
          .from('outreach_sequences')
          .select('id, name, description, company')
          .eq('company', selectedCompany)

        if (error) {
          // console.warn('Outreach sequences table may not exist or be accessible:', error)
          // Set empty array if table doesn't exist
          setOutreachSequences([])
          return
        }

        setOutreachSequences(data || [])
      } catch (error) {
        // console.warn('Error fetching outreach sequences, using empty array:', error)
        setOutreachSequences([])
      }
    }

    fetchOutreachSequences()
  }, [selectedCompany])

  // Update form company when selectedCompany changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, company: selectedCompany }))
  }, [selectedCompany])

  // Fetch sequence steps when outreach sequence is selected
  const fetchSequenceSteps = async (sequenceId: string) => {
    if (!sequenceId) {
      setSelectedSequenceSteps([])
      return
    }
    
    // console.log('Fetching steps for sequence:', sequenceId)
    setFetchingSteps(true)
    try {
      const { data: steps, error } = await supabase
        .from('outreach_steps')
        .select('id, step_order, type, content_link, day_offset, sequence_id')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true })

      if (error) {
        // console.warn('Error fetching sequence steps:', error)
        setSelectedSequenceSteps([])
      } else {
        // console.log('Received sequence steps:', steps)
        setSelectedSequenceSteps(steps || [])
        
                 // Auto-calculate end date based on last step
         if (steps && steps.length > 0 && formData.launchDate) {
           try {
             const lastStep = steps[steps.length - 1]
             // console.log('Using last step for end date calculation:', lastStep)
             const launchDate = new Date(formData.launchDate)
             
             // Make sure we have a valid day_offset value (default to 30 if undefined/null/NaN)
             let delayDays = 30; // Default to 30 days if no valid day_offset found
             
             if (lastStep && lastStep.day_offset !== undefined && lastStep.day_offset !== null) {
               const parsedDelay = parseInt(String(lastStep.day_offset))
               if (!isNaN(parsedDelay)) {
                 delayDays = parsedDelay
               } else {
                 // console.warn('Invalid day_offset value, using default 30 days:', lastStep.day_offset)
               }
             } else {
               // console.warn('No day_offset found in last step, using default 30 days')
             }
             
             // console.log('Using delay days:', delayDays)
             
             // Calculate end date safely
             const endDate = new Date(launchDate)
             endDate.setDate(launchDate.getDate() + delayDays)
             
             if (isNaN(endDate.getTime())) {
               // console.warn('Invalid end date calculated, using default 30 days from now')
               const defaultEndDate = new Date(launchDate)
               defaultEndDate.setDate(launchDate.getDate() + 30)
               
               setFormData(prev => ({
                 ...prev,
                 endDate: defaultEndDate.toISOString().split('T')[0]
               }))
             } else {
               // console.log('Calculated end date:', endDate.toISOString().split('T')[0])
               setFormData(prev => ({
                 ...prev,
                 endDate: endDate.toISOString().split('T')[0]
               }))
             }
           } catch (error) {
             // console.error('Error calculating end date:', error)
             // Set a default end date 30 days from launch date
             try {
               const launchDate = new Date(formData.launchDate)
               const defaultEndDate = new Date(launchDate)
               defaultEndDate.setDate(launchDate.getDate() + 30)
               
               setFormData(prev => ({
                 ...prev,
                 endDate: defaultEndDate.toISOString().split('T')[0]
               }))
             } catch (e) {
               // console.error('Failed to set default end date:', e)
               return formData.launchDate
             }
           }
         } else {
           // No steps found, set default end date 30 days from launch date
           try {
             if (formData.launchDate) {
               const launchDate = new Date(formData.launchDate)
               const defaultEndDate = new Date(launchDate)
               defaultEndDate.setDate(launchDate.getDate() + 30)
               
               setFormData(prev => ({
                 ...prev,
                 endDate: defaultEndDate.toISOString().split('T')[0]
               }))
             }
           } catch (e) {
             // console.error('Failed to set default end date with no steps:', e)
           }
         }
      }
    } catch (error) {
      // console.error('Error calculating end date:', error)
      setSelectedSequenceSteps([])
    } finally {
      setFetchingSteps(false)
    }
  }

  // Handle sequence selection change
  const handleSequenceChange = (sequenceId: string) => {
    // console.log('Sequence selected:', sequenceId)
    setFormData(prev => ({ ...prev, outreachSequenceId: sequenceId }))
    
    if (!sequenceId) {
      // console.log('Clearing sequence steps')
      setSelectedSequenceSteps([])
      return
    }
    
    // console.log('Fetching steps for sequence:', sequenceId)
    fetchSequenceSteps(sequenceId)
  }

  // Handle launch date change - recalculate end date
  const handleLaunchDateChange = (launchDate: string) => {
    setFormData(prev => ({ ...prev, launchDate }))
    
    // Recalculate end date if sequence is selected
    if (selectedSequenceSteps.length > 0 && launchDate) {
      try {
        const lastStep = selectedSequenceSteps[selectedSequenceSteps.length - 1]
        // console.log('Recalculating end date with launch date change, using step:', lastStep)
        const newLaunchDate = new Date(launchDate)
        
        // Make sure we have a valid day_offset value (default to 30 if undefined/null/NaN)
        let delayDays = 30; // Default to 30 days if no valid day_offset found
        
        if (lastStep && lastStep.day_offset !== undefined && lastStep.day_offset !== null) {
          const parsedDelay = parseInt(String(lastStep.day_offset))
          if (!isNaN(parsedDelay)) {
            delayDays = parsedDelay
          } else {
            // console.warn('Invalid day_offset value in launch date change, using default 30 days:', lastStep.day_offset)
          }
        } else {
          // console.warn('No day_offset found in last step during launch date change, using default 30 days')
        }
        
        // console.log('Using delay days for launch date change:', delayDays)
        
        // Calculate end date safely
        const endDate = new Date(newLaunchDate)
        endDate.setDate(newLaunchDate.getDate() + delayDays)
        
        if (isNaN(endDate.getTime())) {
          // console.warn('Invalid end date calculated during launch date change, using default 30 days from now')
          const defaultEndDate = new Date(newLaunchDate)
          defaultEndDate.setDate(newLaunchDate.getDate() + 30)
          
          setFormData(prev => ({
            ...prev,
            endDate: defaultEndDate.toISOString().split('T')[0]
          }))
        } else {
          // console.log('Calculated new end date after launch date change:', endDate.toISOString().split('T')[0])
          setFormData(prev => ({
            ...prev,
            endDate: endDate.toISOString().split('T')[0]
          }))
        }
      } catch (error) {
        // console.error('Error calculating end date during launch date change:', error)
        // Set a default end date 30 days from launch date
        try {
          const newLaunchDate = new Date(launchDate)
          const defaultEndDate = new Date(newLaunchDate)
          defaultEndDate.setDate(newLaunchDate.getDate() + 30)
          
          setFormData(prev => ({
            ...prev,
            endDate: defaultEndDate.toISOString().split('T')[0]
          }))
        } catch (e) {
          // console.error('Failed to set default end date during launch date change:', e)
          return launchDate
        }
      }
    } else if (launchDate) {
      // No sequence steps, set default end date 30 days from launch date
      try {
        const newLaunchDate = new Date(launchDate)
        const defaultEndDate = new Date(newLaunchDate)
        defaultEndDate.setDate(newLaunchDate.getDate() + 30)
        
        setFormData(prev => ({
          ...prev,
          endDate: defaultEndDate.toISOString().split('T')[0]
        }))
      } catch (e) {
        // console.error('Failed to set default end date with no sequence:', e)
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      complete: 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      active: <Activity className="h-3 w-3" />,
      complete: <CheckCircle className="h-3 w-3" />
    }
    return icons[status as keyof typeof icons] || icons.active
  }

  const handleCreateCampaign = () => {
    if (!formData.name || !formData.outreachSequenceId) {
      alert('Please fill in all required fields')
      return
    }
    
    // Ensure end date is properly set based on sequence before proceeding
    if (selectedSequenceSteps.length > 0) {
      // console.log('Using fixed end date from sequence:', formData.endDate)
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCampaigns = filteredCampaigns.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedStatus])
  
  // Debug when sequence steps change
  useEffect(() => {
    // console.log('Selected sequence steps changed:', selectedSequenceSteps)
  }, [selectedSequenceSteps])

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
            <Link
              href="/outreach-sequences"
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <List className="h-4 w-4 mr-2" />
              View Sequences
            </Link>
          </div>
        </div>

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
              <p className="text-2xl font-bold text-blue-600">
                {filteredCampaigns.filter(c => c.status === 'complete').length}
              </p>
              <p className="text-sm text-gray-600">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {filteredCampaigns.reduce((sum, c) => sum + c.leadCount, 0)}
              </p>
              <p className="text-sm text-gray-600">
                {selectedCompany === 'Avalern' ? 'Total School Districts' : 'Total Leads'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  {['active', 'complete'].map(status => (
                    <option key={status} value={status} className="capitalize">{status}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {filteredCampaigns.length === 0 ? (
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedCompany === 'Avalern' ? (
                          <div className="flex items-center">
                            <span>School Districts</span>
                            <span className="ml-1 text-xs text-purple-600 lowercase normal-case font-normal">(count)</span>
                          </div>
                        ) : 'Leads'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Calls
                       </th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         LinkedIn
                       </th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Engaged
                       </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Launch Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentCampaigns.map((campaign) => (
                      <tr 
                        key={campaign.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewCampaign(campaign)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${campaign.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                              {campaign.outreach_sequence && (
                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                  <Target className="h-3 w-3 mr-1" />
                                  {campaign.outreach_sequence.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(campaign.status || 'active')}`}>
                            {getStatusIcon(campaign.status || 'active')}
                            <span className="ml-1 capitalize">{campaign.status || 'active'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-semibold">{campaign.leadCount}</span>
                            {campaign.company === 'Avalern' && (
                              <span className="ml-1 text-xs text-purple-600 font-medium">school districts</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{campaign.emailsSent}</span>
                          </div>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center text-sm text-gray-900">
                             <Phone className="h-4 w-4 mr-2 text-gray-400" />
                             <span>{campaign.callsMade}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center text-sm text-gray-900">
                             <MessageSquare className="h-4 w-4 mr-2 text-gray-400" />
                             <span>{campaign.linkedinMessages || 0}</span>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center text-sm text-blue-600">
                             <Calendar className="h-4 w-4 mr-2" />
                             <span className="font-semibold">{campaign.appointmentsBooked}</span>
                           </div>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(campaign.launch_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewCampaign(campaign)
                            }}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(endIndex, filteredCampaigns.length)}</span> of{' '}
                        <span className="font-medium">{filteredCampaigns.length}</span> campaigns
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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
                    onChange={(e) => handleLaunchDateChange(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date * 
                    {selectedSequenceSteps.length > 0 && (() => {
                      // console.log('Rendering with steps:', selectedSequenceSteps);
                      return (
                        <span className="text-xs font-bold text-green-600 ml-1">
                          (Fixed - Based on Sequence with {selectedSequenceSteps.length} steps)
                        </span>
                      );
                    })()}
                  </label>
                  {selectedSequenceSteps.length > 0 ? (
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.endDate}
                        readOnly={true}
                        disabled={true}
                        className="w-full px-4 py-3 border border-green-300 rounded-lg bg-green-50 text-green-800 cursor-not-allowed"
                      />
                      <div className="absolute inset-0 bg-green-50 bg-opacity-50 flex items-center justify-center pointer-events-none">
                        <div className="text-sm font-medium text-green-800 bg-green-50 px-2 py-1 rounded">
                          {new Date(formData.endDate).toLocaleDateString()} (Fixed)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.launchDate}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    />
                  )}
                  {selectedSequenceSteps.length > 0 && (
                    <p className="text-xs text-green-700 mt-1 font-medium">
                      This date is fixed based on the last scheduled touchpoint in your sequence ({selectedSequenceSteps.length} steps)
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outreach Sequence *</label>
                  <select
                    value={formData.outreachSequenceId}
                    onChange={(e) => handleSequenceChange(e.target.value)}
                    disabled={fetchingSteps}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-50"
                  >
                    <option value="">Select an outreach sequence...</option>
                    {outreachSequences.map(sequence => (
                      <option key={sequence.id} value={sequence.id}>
                        {sequence.name}
                      </option>
                    ))}
                  </select>
                  {fetchingSteps && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></span>
                      Calculating campaign timeline...
                    </p>
                  )}
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