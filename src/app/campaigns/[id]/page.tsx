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
  MessageSquare,
  Activity
} from 'lucide-react'

// Import modular components
import CampaignHeader from '@/components/campaigns/CampaignHeader'
import CampaignStats from '@/components/campaigns/CampaignStats'
import CampaignTabs from '@/components/campaigns/CampaignTabs'
import CampaignOverviewTab from '@/components/campaigns/CampaignOverviewTab'
import DeleteCampaignModal from '@/components/campaigns/DeleteCampaignModal'

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
        <CampaignHeader 
          campaign={campaign}
          isEditing={isEditing}
          updating={updating}
          setIsEditing={setIsEditing}
          handleUpdateCampaign={handleUpdateCampaign}
          setShowDeleteModal={setShowDeleteModal}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />

        {/* Campaign Stats */}
        <CampaignStats campaign={campaign} />

        {/* Tab Navigation */}
        <CampaignTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          campaignCompany={campaign.company}
          leadsCount={campaignLeads.length}
          touchpointsCount={campaignTouchpoints.length}
        />

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Campaign Overview Tab */}
          {activeTab === 'overview' && (
            <CampaignOverviewTab 
              campaign={campaign}
              isEditing={isEditing}
              editFormData={editFormData}
              setEditFormData={setEditFormData}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              sequenceSteps={sequenceSteps}
              loadingSequenceSteps={loadingSequenceSteps}
            />
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
                          {/* Lead Edit Panel */}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Districts View for Avalern */}
                  {campaign.company === 'Avalern' && contactTab === 'districts' && (
                    <div className="flex gap-6">
                      <div className={`transition-all duration-300 ${selectedDistrictForEdit ? 'w-1/2' : 'w-full'}`}>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          {/* Districts Table */}
                        </div>
                      </div>

                      {selectedDistrictForEdit && editingDistrictData && (
                        <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                           {/* District Edit Panel */}
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
              {/* Touchpoints content */}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <DeleteCampaignModal 
            campaignName={campaign.name}
            deleting={deleting}
            setShowDeleteModal={setShowDeleteModal}
            handleDeleteCampaign={handleDeleteCampaign}
          />
        )}
      </div>
    </DashboardLayout>
  )
} 