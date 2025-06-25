'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Target,
  Calendar,
  Users,
  Mail,
  Phone,
  Edit2,
  ArrowLeft,
  CheckCircle,
  Plus,
  Minus,
  User,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare
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
  linkedinMessages?: number
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
  const [contactTab, setContactTab] = useState<'contacts' | 'districts'>('contacts')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Lead management
  const [campaignLeads, setCampaignLeads] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  
  // District management (for Avalern)
  const [campaignDistricts, setCampaignDistricts] = useState<any[]>([])
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [selectedDistrictForEdit, setSelectedDistrictForEdit] = useState<any | null>(null)
  const [editingDistrictData, setEditingDistrictData] = useState<any | null>(null)
  const [updatingDistrict, setUpdatingDistrict] = useState(false)
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
  const [sequenceSteps, setSequenceSteps] = useState<{
    id: string;
    step_order: number;
    type: string;
    name?: string;
    day_offset: number;
    days_after_previous?: number;
  }[]>([])
  const [loadingSequenceSteps, setLoadingSequenceSteps] = useState(false)

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    name: '',
    company: '',
    description: '',
    start_date: '',
    end_date: '',
    instantly_campaign_id: '',
    status: 'active'
  })

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
      fetchOutreachSequences()
    }
  }, [campaignId, selectedCompany])

  const fetchCampaignDistricts = async () => {
    setLoadingDistricts(true)
    try {
      console.log(`Fetching districts for campaign: ${campaignId}`)
      
      // Try direct database query first for more reliable results
      const { data: directDistricts, error: directError } = await supabase
        .from('district_leads')
        .select(`
          id, 
          district_name, 
          county, 
          status, 
          campaign_id,
          created_at,
          district_contacts(id, first_name, last_name, email, phone, status)
        `)
        .eq('campaign_id', campaignId)
      
      if (directError) {
        console.error('Direct database query failed:', directError)
        
        // Fall back to API if direct query fails
        const response = await fetch(`/api/campaign-districts?campaign_id=${campaignId}`)
        
        if (!response.ok) {
          console.error(`Error fetching campaign districts from API: ${response.status}`)
          return
        }
        
        const { districts } = await response.json()
        console.log(`Fetched ${districts?.length || 0} campaign districts from API`)
        
        // Enrich with contact counts
        const enrichedDistricts = (districts || []).map((district: any) => ({
          ...district,
          total_contacts: district.district_contacts?.length || 0,
          valid_contacts: district.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0
        }))
        
        setCampaignDistricts(enrichedDistricts)
      } else {
        console.log(`Direct database query found ${directDistricts?.length || 0} districts with campaign_id ${campaignId}`)
        
        // Enrich with contact counts
        const enrichedDistricts = (directDistricts || []).map((district: any) => ({
          ...district,
          total_contacts: district.district_contacts?.length || 0,
          valid_contacts: district.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0
        }))
        
        setCampaignDistricts(enrichedDistricts)
      }
    } catch (error) {
      console.error('Error fetching campaign districts:', error)
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Fetch leads and touchpoints after campaign is loaded
  useEffect(() => {
    if (campaign?.id && selectedCompany) {
      // Data is now fetched in fetchCampaign
    }
  }, [campaign?.id, selectedCompany]);
  
  // Debug loaded data
  useEffect(() => {
    console.log(`Campaign leads loaded: ${campaignLeads.length}`);
  }, [campaignLeads]);
  
  useEffect(() => {
    console.log(`Campaign touchpoints loaded: ${campaignTouchpoints.length}`);
    
    // Initialize filtered touchpoints whenever touchpoints change
    setFilteredCampaignTouchpoints(campaignTouchpoints);
  }, [campaignTouchpoints]);

  // Helper function to get touchpoint counts for a lead/contact
  const getTouchpointCounts = (leadId: string, isDistrictContact: boolean = false) => {
    console.log(`Getting touchpoint counts for ${isDistrictContact ? 'district contact' : 'lead'} ${leadId}`);
    
    // Filter touchpoints based on the ID field
    const idField = isDistrictContact ? 'district_contact_id' : 'lead_id';
    
    const leadTouchpoints = campaignTouchpoints.filter(tp => tp[idField] === leadId);
    console.log(`Found ${leadTouchpoints.length} touchpoints for ${idField}=${leadId}`);
    
    const scheduled = leadTouchpoints.filter(tp => !tp.completed_at).length;
    const completed = leadTouchpoints.filter(tp => tp.completed_at).length;
    const total = leadTouchpoints.length;
    
    return { scheduled, completed, total };
  }

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
        console.log('Fetched sequence steps:', data)
        
        // Calculate days_after_previous for each step
        const stepsWithDaysAfterPrevious = data?.map((step, index, steps) => {
          if (index === 0) {
            // First step has no previous step
            return { ...step, days_after_previous: step.day_offset }
          } else {
            // Calculate days after previous step
            const previousStep = steps[index - 1]
            const daysAfterPrevious = step.day_offset - previousStep.day_offset
            return { ...step, days_after_previous: daysAfterPrevious }
          }
        }) || []
        
        setSequenceSteps(stepsWithDaysAfterPrevious)
      }
    } catch (error) {
      console.error('Error in fetchSequenceSteps:', error)
    } finally {
      setLoadingSequenceSteps(false)
    }
  }

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      
      // Fetch basic campaign data first
      const { data: basicCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, company, start_date, end_date, created_at, outreach_sequence_id, description, instantly_campaign_id, status')
        .eq('id', campaignId)
        .single()

      if (campaignError) {
        console.error('Error fetching campaign:', campaignError)
        setLoading(false)
        return
      }

      let campaignData = { ...basicCampaign }

      // Fetch outreach sequence separately
      if (basicCampaign.outreach_sequence_id) {
        const { data: sequence, error: seqError } = await supabase
            .from('outreach_sequences')
            .select('id, name, description')
            .eq('id', basicCampaign.outreach_sequence_id)
            .single()
        if (!seqError && sequence) {
          (campaignData as any).outreach_sequence = sequence
        }
      }

      // Fetch all related data in one go
      let allLeads: any[] = [];
      let allTouchpoints: any[] = [];
      let allDistricts: any[] = [];
      
      if (campaignData.company === 'Avalern') {
        const { data: districts, error: districtError } = await supabase
          .from('district_leads')
          .select('id, district_name, county, status, campaign_id, created_at, district_contacts(id, first_name, last_name, email, phone, status, title)')
          .eq('campaign_id', campaignId);
          
        if (!districtError && districts) {
          allDistricts = districts.map(d => ({
            ...d,
            total_contacts: d.district_contacts.length,
            valid_contacts: d.district_contacts.filter((c: any) => c.status === 'Valid').length
          }));
          
          const allContacts = districts.flatMap(d => d.district_contacts.map((c: any) => ({
            ...c,
            company: d.district_name, // Use district name as company
            is_district_contact: true
          })));
          
          allLeads = allContacts;
          
          const contactIds = allContacts.map(c => c.id);
          if (contactIds.length > 0) {
            const { data: touchpoints, error: tpError } = await supabase
              .from('touchpoints')
              .select('*, district_contact:district_contacts!inner(first_name, last_name, email)')
              .in('district_contact_id', contactIds);
            
            if (!tpError) {
              allTouchpoints = touchpoints;
            }
          }
        }
      } else {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('*, campaign:campaigns(name)')
          .eq('campaign_id', campaignId);

        if (!leadsError && leads) {
          allLeads = leads;
          const leadIds = leads.map(l => l.id);
          if (leadIds.length > 0) {
            const { data: touchpoints, error: tpError } = await supabase
              .from('touchpoints')
              .select('*, lead:leads!inner(first_name, last_name, email)')
              .in('lead_id', leadIds);
            
            if (!tpError) {
              allTouchpoints = touchpoints;
            }
          }
        }
      }
      
      setCampaignLeads(allLeads);
      setCampaignTouchpoints(allTouchpoints);
      if(campaignData.company === 'Avalern') {
        setCampaignDistricts(allDistricts);
      }

      // Perform final enrichment for campaign stats
      const engagedCount = allLeads.filter((lead: any) => lead.status === 'engaged').length;
      const wonCount = allLeads.filter((lead: any) => lead.status === 'won').length;
      const emailsSent = allTouchpoints.filter((tp: any) => tp.type === 'email' && tp.completed_at).length;
      const callsMade = allTouchpoints.filter((tp: any) => tp.type === 'call' && tp.completed_at).length;
      const linkedinMessages = allTouchpoints.filter((tp: any) => tp.type === 'linkedin_message' && tp.completed_at).length;
      const conversionRate = allLeads.length > 0 ? Number(((wonCount / allLeads.length) * 100).toFixed(1)) : 0;

      const enrichedCampaign = {
        ...campaignData,
        leadCount: allLeads.length,
        emailsSent,
        callsMade,
        linkedinMessages,
        appointmentsBooked: engagedCount,
        sales: wonCount,
        conversionRate,
        launch_date: campaignData.start_date || campaignData.created_at,
        status: campaignData.status || 'active', // Keep the actual status from the database
        outreach_sequence: Array.isArray((campaignData as any).outreach_sequence) ? (campaignData as any).outreach_sequence[0] : (campaignData as any).outreach_sequence
      } as Campaign

      setCampaign(enrichedCampaign);
      setEditFormData({
        name: enrichedCampaign.name,
        company: enrichedCampaign.company,
        start_date: enrichedCampaign.start_date?.split('T')[0] || '',
        end_date: enrichedCampaign.end_date?.split('T')[0] || '',
        description: enrichedCampaign.description || '',
        instantly_campaign_id: enrichedCampaign.instantly_campaign_id || '',
        status: enrichedCampaign.status || 'active'
      });
        
      if (enrichedCampaign.outreach_sequence_id) {
        fetchSequenceSteps(enrichedCampaign.outreach_sequence_id);
      }

    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  }

  const fetchOutreachSequences = async () => {
    if (!selectedCompany) {
      console.warn('No company selected, skipping outreach sequences fetch')
      setOutreachSequences([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('outreach_sequences')
        .select('id, name, description, company')
        .eq('company', selectedCompany)

      if (error) {
        console.warn('Error fetching outreach sequences:', error.message || error)
        setOutreachSequences([])
        return
      }

      setOutreachSequences(data || [])
    } catch (error) {
      console.warn('Error fetching outreach sequences:', error)
      setOutreachSequences([])
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
          instantly_campaign_id: editFormData.instantly_campaign_id,
          status: editFormData.status
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

      fetchCampaign() // Refresh all campaign data
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

  const handleOpenDistrictEditPanel = (district: any) => {
    setSelectedDistrictForEdit(district)
    setEditingDistrictData({ ...district })
  }

  const handleCloseDistrictEditPanel = () => {
    setSelectedDistrictForEdit(null)
    setEditingDistrictData(null)
  }

  const handleUpdateDistrictInCampaign = async () => {
    if (!editingDistrictData || !selectedDistrictForEdit) {
      return
    }

    setUpdatingDistrict(true)
    try {
      const { error } = await supabase
        .from('district_leads')
        .update({
          district_name: editingDistrictData.district_name,
          county: editingDistrictData.county,
          status: editingDistrictData.status
        })
        .eq('id', selectedDistrictForEdit.id)

      if (error) {
        console.error('Error updating district:', error)
        alert('Failed to update district')
        return
      }

      // Refresh districts data
      fetchCampaignDistricts()
      handleCloseDistrictEditPanel()
    } catch (error) {
      console.error('Error updating district:', error)
      alert('Failed to update district')
    } finally {
      setUpdatingDistrict(false)
    }
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
      fetchCampaign() // Refresh all campaign data
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
      'complete': 'bg-blue-100 text-blue-800'
    }
    return colors[status as keyof typeof colors] || colors['active']
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Target className="h-4 w-4" />
      case 'complete':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  // Filter touchpoints based on criteria
  useEffect(() => {
    if (!campaignTouchpoints) {
      setFilteredCampaignTouchpoints([]);
      return;
    }
    
    let filtered = [...campaignTouchpoints];
    
    // Filter by type
    if (touchpointTypeFilter) {
      filtered = filtered.filter(tp => tp.type === touchpointTypeFilter);
    }
    
    // Filter by status/outcome
    if (touchpointOutcomeFilter) {
      if (touchpointOutcomeFilter === 'scheduled') {
        filtered = filtered.filter(tp => !tp.completed_at);
      } else if (touchpointOutcomeFilter === 'completed') {
        filtered = filtered.filter(tp => tp.completed_at);
      }
    }
    
    // Filter by date range
    if (touchpointDateFromFilter) {
      const fromDate = new Date(touchpointDateFromFilter);
      filtered = filtered.filter(tp => {
        const date = new Date(tp.scheduled_at || tp.completed_at);
        return date >= fromDate;
      });
    }
    
    if (touchpointDateToFilter) {
      const toDate = new Date(touchpointDateToFilter);
      // Set time to end of day
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tp => {
        const date = new Date(tp.scheduled_at || tp.completed_at);
        return date <= toDate;
      });
    }
    
    // Sort by scheduled date
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduled_at || a.completed_at || 0).getTime();
      const dateB = new Date(b.scheduled_at || b.completed_at || 0).getTime();
      return dateA - dateB;
    });
    
    setFilteredCampaignTouchpoints(filtered);
  }, [campaignTouchpoints, touchpointTypeFilter, touchpointOutcomeFilter, touchpointDateFromFilter, touchpointDateToFilter]);

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Campaigns
            </button>
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
          
          {/* Campaign Title and Info */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${campaign.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">{campaign.company}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status || 'active')}`}>
                {getStatusIcon(campaign.status || 'active')}
                <span className="ml-1 capitalize">{campaign.status || 'active'}</span>
              </span>
            </div>
            {campaign.description && (
              <p className="text-gray-600 mt-2">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.linkedinMessages || 0}</p>
                <p className="text-sm text-gray-600">LinkedIn Messages</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-emerald-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{campaign.appointmentsBooked}</p>
                <p className="text-sm text-gray-600">Engaged Leads</p>
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
            {campaign.company === 'Avalern' ? 'Contact Management' : 'Lead Management'} ({campaignLeads.length})
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
                    </select>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status || 'active')}`}>
                      {getStatusIcon(campaign.status || 'active')}
                      <span className="ml-1 capitalize">{campaign.status || 'active'}</span>
                    </span>
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
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                  <h4 className="text-base font-medium text-gray-900">
                                    {step.type.replace('_', ' ')}
                                  </h4>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Day {step.day_offset}
                                  </span>
                                  {index > 0 && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      +{step.days_after_previous} days after previous
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-600">
                                  on {stepDate.toLocaleDateString()}
                                </span>
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
              {/* Sub-tabs for Avalern campaigns */}
              {campaign.company === 'Avalern' && (
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                  <button
                    onClick={() => setContactTab('contacts')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      contactTab === 'contacts'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    District Contacts ({campaignLeads.length})
                  </button>
                  <button
                    onClick={() => setContactTab('districts')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      contactTab === 'districts'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Districts ({campaignDistricts.length})
                  </button>
                </div>
              )}

              {loadingLeads || (campaign.company === 'Avalern' && loadingDistricts) ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : (
                <>
                  {/* District Contacts or Regular Leads View */}
                  {(campaign.company !== 'Avalern' || contactTab === 'contacts') && (
                    <div className="flex gap-6">
                      <div className={`transition-all duration-300 ${selectedLeadForEdit ? 'w-1/2' : 'w-full'}`}>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {campaign.company === 'Avalern' ? 'District Contacts' : 'Campaign Leads'} ({campaignLeads.length})
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {campaign.company === 'Avalern' ? 'Contact' : 'Lead'}
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {campaign.company === 'Avalern' ? 'District/Title' : 'Details'}
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Touchpoints</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {campaignLeads.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                      No contacts found for this campaign.
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
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800`}>
                                          {lead.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div>
                                            <div className="text-sm text-gray-900 font-medium">
                                              {lead.company}
                                            </div>
                                            <div className="text-sm text-gray-500">{lead.title}</div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col space-y-1">
                                            {(() => {
                                              const counts = getTouchpointCounts(lead.id, lead.is_district_contact)
                                              return (
                                                <>
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {counts.scheduled} scheduled
                                                  </span>
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {counts.completed} completed
                                                  </span>
                                                </>
                                              )
                                            })()}
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

                      {selectedLeadForEdit && editingLeadData && (
                        <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                          {/* Paste the existing content of your "Lead Edit Panel" here */}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Districts View for Avalern */}
                  {campaign.company === 'Avalern' && contactTab === 'districts' && (
                    <div className="flex gap-6">
                      <div className={`transition-all duration-300 ${selectedDistrictForEdit ? 'w-1/2' : 'w-full'}`}>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          {/* Paste the existing content of your "Districts Table" here */}
                        </div>
                      </div>

                      {selectedDistrictForEdit && editingDistrictData && (
                        <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                           {/* Paste the existing content of your "District Edit Panel" here */}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {/* Touchpoints Tab */}
          {activeTab === 'touchpoints' && (
            <div className="p-6">
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Filter Touchpoints</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={touchpointTypeFilter}
                        onChange={(e) => setTouchpointTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">All Types</option>
                        <option value="email">Email</option>
                        <option value="call">Call</option>
                        <option value="linkedin_message">LinkedIn Message</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={touchpointOutcomeFilter}
                        onChange={(e) => setTouchpointOutcomeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">All Statuses</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={touchpointDateFromFilter}
                        onChange={(e) => setTouchpointDateFromFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={touchpointDateToFilter}
                        onChange={(e) => setTouchpointDateToFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Touchpoint Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Touchpoints</p>
                    <p className="text-2xl font-bold text-gray-900">{campaignTouchpoints.length}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {campaignTouchpoints.filter(tp => !tp.completed_at).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {campaignTouchpoints.filter(tp => tp.completed_at).length}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <p className="text-sm text-gray-600 mb-1">Upcoming (7 days)</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {campaignTouchpoints.filter(tp => {
                        if (!tp.scheduled_at || tp.completed_at) return false;
                        const scheduled = new Date(tp.scheduled_at);
                        const now = new Date();
                        const sevenDaysLater = new Date();
                        sevenDaysLater.setDate(now.getDate() + 7);
                        return scheduled >= now && scheduled <= sevenDaysLater;
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Touchpoints List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Touchpoint Schedule</h3>
                    <span className="text-sm text-gray-500">
                      {filteredCampaignTouchpoints?.length || 0} touchpoints
                    </span>
                  </div>
                  <div className="p-6">
                    {loadingTouchpoints ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading touchpoints...</span>
                      </div>
                    ) : campaignTouchpoints.length === 0 ? (
                      <div className="text-center py-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No touchpoints found</h3>
                        <p className="text-gray-500 mb-4">
                          This campaign doesn't have any scheduled touchpoints yet.
                        </p>
                        <p className="text-sm text-gray-600">
                          Touchpoints are created automatically when you add leads or district contacts to a campaign with an outreach sequence.
                        </p>
                      </div>
                    ) : filteredCampaignTouchpoints.length === 0 ? (
                      <div className="text-center py-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No matching touchpoints</h3>
                        <p className="text-gray-500 mb-4">
                          No touchpoints match your current filters. Try adjusting your search criteria.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredCampaignTouchpoints.map((touchpoint) => {
                          // Handle different data structures for CraftyCode vs Avalern
                          const contact = touchpoint.lead || touchpoint.district_contact
                          const contactEmail = contact?.email
                          const isScheduled = !touchpoint.completed_at
                          const isPast = touchpoint.scheduled_at && new Date(touchpoint.scheduled_at) < new Date()
                          
                          return (
                            <div 
                              key={touchpoint.id} 
                              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                                isScheduled 
                                  ? isPast 
                                    ? 'bg-amber-50 border border-amber-200' 
                                    : 'bg-blue-50 border border-blue-200'
                                  : 'bg-green-50 border border-green-200'
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
                                  <span className="font-medium">
                                    {contact?.first_name} {contact?.last_name}
                                  </span>
                                  {touchpoint.district_contact && touchpoint.district_contact.district_lead && (
                                    <span className="text-xs text-gray-500">
                                      ({touchpoint.district_contact.district_lead.district_name})
                                    </span>
                                  )}
                                </div>
                                {touchpoint.subject && (
                                  <p className="text-sm font-medium text-gray-700 mt-1">{touchpoint.subject}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                  {contactEmail && (
                                    <p className="text-xs text-gray-500">{contactEmail}</p>
                                  )}
                                  {touchpoint.scheduled_at && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Scheduled: {new Date(touchpoint.scheduled_at).toLocaleDateString()} {new Date(touchpoint.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                  )}
                                  {touchpoint.completed_at && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                      Completed: {new Date(touchpoint.completed_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                {touchpoint.content && (
                                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                    {touchpoint.content.substring(0, 100)}{touchpoint.content.length > 100 ? '...' : ''}
                                  </p>
                                )}
                                {touchpoint.outcome && (
                                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                                    <span className="font-medium mr-1">Outcome:</span> 
                                    <span className={`${
                                      touchpoint.outcome.toLowerCase().includes('positive') ? 'text-green-600' :
                                      touchpoint.outcome.toLowerCase().includes('negative') ? 'text-red-600' :
                                      'text-gray-600'
                                    }`}>{touchpoint.outcome}</span>
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                <div className={`w-3 h-3 rounded-full ${
                                  isScheduled
                                    ? isPast
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                    : 'bg-green-500'
                                }`}></div>
                              </div>
                            </div>
                          )
                        })}
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