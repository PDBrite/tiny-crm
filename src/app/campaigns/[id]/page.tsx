'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
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
import CampaignTouchpointsTab from '@/components/campaigns/CampaignTouchpointsTab'
import CampaignDistrictContactsTable from '@/components/campaigns/CampaignDistrictContactsTable'
import CampaignDistrictsTable from '@/components/campaigns/CampaignDistrictsTable'
import DistrictContactEditPanel from '@/components/campaigns/DistrictContactEditPanel'

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
  created_by?: {
    id: string
    email: string
    name: string
    role: string
  }
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
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<any | null>(null)
  const [editingContactData, setEditingContactData] = useState<any | null>(null)
  const [updatingContact, setUpdatingContact] = useState(false)
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
  const [touchpointItemsPerPage, setTouchpointItemsPerPage] = useState(10)
  const [touchpointTotalPages, setTouchpointTotalPages] = useState(1)
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

  // Add states for creator filter and users
  const [touchpointCreatorFilter, setTouchpointCreatorFilter] = useState('');
  const [users, setUsers] = useState<Array<{ id: string, email: string, first_name?: string, last_name?: string }>>([]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
      fetchOutreachSequences()
    }
  }, [campaignId, selectedCompany])

  const fetchCampaignDistricts = async () => {
    setLoadingDistricts(true)
    try {
      console.log(`Fetching districts for campaign: ${campaignId}, company: ${campaign?.company}`)
      
      // Use the API endpoint
        const response = await fetch(`/api/campaign-districts?campaign_id=${campaignId}`)
        
        if (!response.ok) {
          console.error(`Error fetching campaign districts from API: ${response.status}`)
          return
        }
        
        const { districts } = await response.json()
        console.log(`Fetched ${districts?.length || 0} campaign districts from API`)
        
      if (districts?.length === 0) {
        console.log('No districts found for this campaign via API')
      } else {
        console.log('Sample district from API:', districts[0])
      }
        
        // Enrich with contact counts
      const enrichedDistricts = (districts || []).map((district: any) => ({
          ...district,
          total_contacts: district.district_contacts?.length || 0,
          valid_contacts: district.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0
        }))
        
        setCampaignDistricts(enrichedDistricts)
    } catch (error) {
      console.error('Error fetching campaign districts:', error)
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Fetch leads and touchpoints after campaign is loaded
  useEffect(() => {
    if (campaign?.id && selectedCompany) {
      // For Avalern campaigns, explicitly fetch districts
      if (campaign.company === 'Avalern') {
        console.log('Campaign is Avalern, fetching districts explicitly');
        fetchCampaignDistricts();
    }
    }
  }, [campaign?.id, selectedCompany, campaign?.company]);
  
  // Debug loaded data
  useEffect(() => {
    console.log(`Campaign leads loaded: ${campaignLeads.length}`);
  }, [campaignLeads]);
  
  useEffect(() => {
    if (!campaignTouchpoints) return;
    
    let filtered = [...campaignTouchpoints];
    
    // Apply type filter
    if (touchpointTypeFilter) {
      filtered = filtered.filter(tp => tp.type === touchpointTypeFilter);
    }
    
    // Apply outcome filter
    if (touchpointOutcomeFilter) {
      if (touchpointOutcomeFilter === 'completed') {
        filtered = filtered.filter(tp => tp.completed_at);
      } else if (touchpointOutcomeFilter === 'scheduled') {
        filtered = filtered.filter(tp => !tp.completed_at);
      }
    }
    
    // Apply date range filters
    if (touchpointDateFromFilter) {
      filtered = filtered.filter(tp => {
        const date = tp.scheduled_at || tp.completed_at;
        return date && new Date(date) >= new Date(touchpointDateFromFilter);
      });
    }
    
    if (touchpointDateToFilter) {
      filtered = filtered.filter(tp => {
        const date = tp.scheduled_at || tp.completed_at;
        return date && new Date(date) <= new Date(touchpointDateToFilter + 'T23:59:59');
      });
    }
    
    // Apply creator filter
    if (touchpointCreatorFilter) {
      filtered = filtered.filter(tp => tp.created_by_id === touchpointCreatorFilter);
    }
    
    // Calculate total pages for pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / touchpointItemsPerPage));
    setTouchpointTotalPages(totalPages);
    
    setFilteredCampaignTouchpoints(filtered);
    setTouchpointCurrentPage(1); // Reset to first page when filters change
  }, [campaignTouchpoints, touchpointTypeFilter, touchpointOutcomeFilter, touchpointDateFromFilter, touchpointDateToFilter, touchpointCreatorFilter, touchpointItemsPerPage]);

  // Fetch users for touchpoint filtering
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users?for_touchpoints=true');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, []);

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
      // Use API endpoint to fetch sequence steps
      const response = await fetch(`/api/outreach-sequences/${sequenceId}`)

      if (!response.ok) {
        console.error('Error fetching sequence steps:', response.status)
        return
      }
      
      const data = await response.json()
      console.log('Fetched sequence data:', data.sequence)
      
      // Extract steps from the sequence
      const steps = data.sequence?.steps || []
        
      // Calculate days_after_previous for each step
      const stepsWithDaysAfterPrevious = steps.map((step: any, index: number, steps: any[]) => {
          if (index === 0) {
            // First step has no previous step
            return { ...step, days_after_previous: step.dayOffset }
          } else {
            // Calculate days after previous step
            const previousStep = steps[index - 1]
            const daysAfterPrevious = step.dayOffset - previousStep.dayOffset
            return { ...step, days_after_previous: daysAfterPrevious }
          }
        }) || []
        
      setSequenceSteps(stepsWithDaysAfterPrevious)
    } catch (error) {
      console.error('Error in fetchSequenceSteps:', error)
    } finally {
      setLoadingSequenceSteps(false)
    }
  }

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      
      // Fetch campaign data from API
      const response = await fetch(`/api/campaign-data?id=${campaignId}`)

      if (!response.ok) {
        console.error('Error fetching campaign data:', response.status)
        setLoading(false)
        return
      }

      const data = await response.json()
      
      if (!data.campaign) {
        console.error('Campaign not found')
        setLoading(false)
        return
      }
      
      const campaignData = data.campaign
      
      // Use API endpoints to fetch related data
      let allLeads: any[] = [];
      let allTouchpoints: any[] = [];
      let allDistricts: any[] = [];
      
      // Fetch districts via API
      if (campaignData.company === 'Avalern') {
        try {
          const districtsResponse = await fetch(`/api/campaign-districts?campaign_id=${campaignId}`);
          if (districtsResponse.ok) {
            const districtsData = await districtsResponse.json();
            console.log(`Fetched ${districtsData.districts?.length || 0} districts via API`);
            
            allDistricts = districtsData.districts.map((d: any) => ({
            ...d,
              total_contacts: d.district_contacts?.length || 0,
              valid_contacts: d.district_contacts?.filter((c: any) => c.status === 'Valid').length || 0
          }));
          
            // Extract contacts from districts
            allLeads = allDistricts.flatMap((d: any) => d.district_contacts?.map((c: any) => ({
            ...c,
              company: d.district_name,
            is_district_contact: true
            })) || []);
          } else {
            console.error('Error fetching districts:', await districtsResponse.text());
          }
        } catch (error) {
          console.error('Error fetching districts via API:', error);
        }
      } else {
        // For non-Avalern campaigns, fetch leads via API
        try {
          const leadsResponse = await fetch(`/api/campaign-leads?campaign_id=${campaignId}`);
          if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json();
            console.log(`Fetched ${leadsData.leads?.length || 0} leads via API`);
            allLeads = leadsData.leads || [];
          } else {
            console.error('Error fetching leads:', await leadsResponse.text());
          }
        } catch (error) {
          console.error('Error fetching leads via API:', error);
        }
      }
      
      // Fetch touchpoints via API for all campaign types
      try {
        const touchpointsResponse = await fetch(`/api/campaign-touchpoints?campaign_id=${campaignId}`);
        if (touchpointsResponse.ok) {
          const touchpointsData = await touchpointsResponse.json();
          console.log(`Fetched ${touchpointsData.touchpoints?.length || 0} touchpoints via API`);
          allTouchpoints = touchpointsData.touchpoints || [];
        } else {
          console.error('Error fetching touchpoints:', await touchpointsResponse.text());
            }
      } catch (error) {
        console.error('Error fetching touchpoints via API:', error);
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
      // Fetch outreach sequences via API
      const response = await fetch(`/api/outreach-sequences?company=${selectedCompany}`)

      if (!response.ok) {
        console.warn('Error fetching outreach sequences:', response.status)
        setOutreachSequences([])
        return
      }

      const data = await response.json()
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
      // Update campaign via API
      const response = await fetch(`/api/campaigns`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: campaign.id,
          name: editFormData.name,
          company: editFormData.company,
          description: editFormData.description,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          instantly_campaign_id: editFormData.instantly_campaign_id,
          status: editFormData.status
        })
      })

      if (!response.ok) {
        console.error('Error updating campaign:', response.status)
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
      // Remove lead from campaign via API
      const response = await fetch(`/api/campaign-leads`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          campaignId: null
        })
      })

      if (!response.ok) {
        console.error('Error removing lead from campaign:', response.status)
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
      // Update district via API
      const response = await fetch(`/api/district-contacts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedDistrictForEdit.id,
          districtName: editingDistrictData.district_name,
          county: editingDistrictData.county,
          status: editingDistrictData.status
        })
      })

      if (!response.ok) {
        console.error('Error updating district:', response.status)
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
      // Update lead via API
      const response = await fetch(`/api/campaign-leads`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedLeadForEdit.id,
          firstName: editingLeadData.first_name,
          lastName: editingLeadData.last_name,
          email: editingLeadData.email,
          phone: editingLeadData.phone,
          city: editingLeadData.city,
          state: editingLeadData.state,
          company: editingLeadData.company,
          status: editingLeadData.status,
          source: editingLeadData.source,
          linkedinUrl: editingLeadData.linkedin_url,
          websiteUrl: editingLeadData.website_url
        })
      })

      if (!response.ok) {
        console.error('Error updating lead:', response.status)
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
      // Delete campaign via API
      const response = await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.error('Error deleting campaign:', response.status)
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

  const handleOpenContactEditPanel = (contact: any) => {
    setSelectedContactForEdit(contact)
    setEditingContactData({ ...contact })
  }

  const handleCloseContactEditPanel = () => {
    setSelectedContactForEdit(null)
    setEditingContactData(null)
  }

  const handleUpdateContact = async () => {
    if (!editingContactData || !selectedContactForEdit) return

    setUpdatingContact(true)
    try {
      // Update district contact via API
      const response = await fetch(`/api/district-contacts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedContactForEdit.id,
          firstName: editingContactData.first_name,
          lastName: editingContactData.last_name,
          email: editingContactData.email,
          phone: editingContactData.phone,
          title: editingContactData.title,
          status: editingContactData.status
        })
      })

      if (!response.ok) {
        console.error('Error updating district contact:', response.status)
        alert('Failed to update district contact')
        return
      }

      alert('District contact updated successfully!')
      handleCloseContactEditPanel()
      fetchCampaign() // Refresh all campaign data
    } catch (error) {
      console.error('Error updating district contact:', error)
      alert('Failed to update district contact')
    } finally {
      setUpdatingContact(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 ml-3">Loading campaign data...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
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
                      <div className={`transition-all duration-300 ${selectedContactForEdit ? 'w-1/2' : 'w-full'}`}>
                        <CampaignDistrictContactsTable
                          campaignLeads={campaignLeads}
                          handleOpenContactEditPanel={handleOpenContactEditPanel}
                          handleRemoveLeadFromCampaign={handleRemoveLeadFromCampaign}
                          getTouchpointCounts={getTouchpointCounts}
                        />
                      </div>

                      {selectedContactForEdit && editingContactData && (
                        <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                          <DistrictContactEditPanel
                            contact={selectedContactForEdit}
                            editingContactData={editingContactData}
                            setEditingContactData={setEditingContactData}
                            handleCloseContactEditPanel={handleCloseContactEditPanel}
                            handleUpdateContact={handleUpdateContact}
                            updating={updatingContact}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Districts View for Avalern */}
                  {campaign.company === 'Avalern' && contactTab === 'districts' && (
                    <div className="flex gap-6">
                      <div className={`transition-all duration-300 ${selectedDistrictForEdit ? 'w-1/2' : 'w-full'}`}>
                        <CampaignDistrictsTable
                          campaignDistricts={campaignDistricts}
                          handleOpenDistrictEditPanel={handleOpenDistrictEditPanel}
                        />
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
            <CampaignTouchpointsTab
              campaignTouchpoints={campaignTouchpoints}
              filteredCampaignTouchpoints={filteredCampaignTouchpoints}
              loadingTouchpoints={loadingTouchpoints}
              touchpointTypeFilter={touchpointTypeFilter}
              setTouchpointTypeFilter={setTouchpointTypeFilter}
              touchpointOutcomeFilter={touchpointOutcomeFilter}
              setTouchpointOutcomeFilter={setTouchpointOutcomeFilter}
              touchpointDateFromFilter={touchpointDateFromFilter}
              setTouchpointDateFromFilter={setTouchpointDateFromFilter}
              touchpointDateToFilter={touchpointDateToFilter}
              setTouchpointDateToFilter={setTouchpointDateToFilter}
              touchpointCreatorFilter={touchpointCreatorFilter}
              setTouchpointCreatorFilter={setTouchpointCreatorFilter}
              users={users}
              currentPage={touchpointCurrentPage}
              setCurrentPage={setTouchpointCurrentPage}
              itemsPerPage={touchpointItemsPerPage}
              setItemsPerPage={setTouchpointItemsPerPage}
              totalPages={touchpointTotalPages}
            />
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