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
  const [sequenceSteps, setSequenceSteps] = useState<any[]>([])
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
      const { data: districts, error } = await supabase
        .from('district_leads')
        .select(`
          id, district_name, county, status, created_at,
          district_contacts(id, first_name, last_name, email, phone, status)
        `)
        .eq('campaign_id', campaignId)
        .order('district_name', { ascending: true })

      if (error) {
        console.error('Error fetching campaign districts:', error)
        return
      }

      // Enrich with contact counts
      const enrichedDistricts = (districts || []).map(district => ({
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
    if (campaign && !loadingLeads && !loadingTouchpoints) {
      fetchCampaignLeads()
      fetchCampaignTouchpoints()
      if (campaign.company === 'Avalern') {
        fetchCampaignDistricts()
      }
    }
  }, [campaign?.id, campaign?.company])

  // Helper function to get touchpoint counts for a lead/contact
  const getTouchpointCounts = (leadId: string) => {
    const leadTouchpoints = campaignTouchpoints.filter(tp => 
      tp.lead_id === leadId || tp.district_contact_id === leadId
    )
    
    const scheduled = leadTouchpoints.filter(tp => !tp.completed_at).length
    const completed = leadTouchpoints.filter(tp => tp.completed_at).length
    const total = leadTouchpoints.length
    
    return { scheduled, completed, total }
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
      
      // Fetch basic campaign data first
      const { data: basicCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, company, start_date, end_date, created_at, outreach_sequence_id, description, instantly_campaign_id, status')
        .eq('id', campaignId)
        .single()

      if (campaignError) {
        console.error('Error fetching campaign:', campaignError)
        return
      }

      let campaignData = { ...basicCampaign }

      // Fetch outreach sequence separately
      if (basicCampaign.outreach_sequence_id) {
        try {
          const { data: sequence, error: seqError } = await supabase
            .from('outreach_sequences')
            .select('id, name, description')
            .eq('id', basicCampaign.outreach_sequence_id)
            .single()

          if (!seqError && sequence) {
            (campaignData as any).outreach_sequence = sequence
          }
        } catch (error) {
          console.warn('Could not fetch outreach sequence:', error)
        }
      }

      // Fetch related data based on company type
      if (selectedCompany === 'Avalern') {
        // Fetch district leads
        const { data: districtLeads, error: districtError } = await supabase
          .from('district_leads')
          .select('id, status')
          .eq('campaign_id', campaignId)

        if (!districtError && districtLeads) {
          // Fetch district contacts
          const districtLeadIds = districtLeads.map(dl => dl.id)
          let districtContacts: any[] = []
          
          if (districtLeadIds.length > 0) {
            const { data: contacts, error: contactsError } = await supabase
              .from('district_contacts')
              .select('id, district_lead_id')
              .in('district_lead_id', districtLeadIds)

            if (!contactsError && contacts) {
              districtContacts = contacts
            }
          }

          // Fetch touchpoints for district contacts
          const contactIds = districtContacts.map(c => c.id)
          let touchpoints: any[] = []
          
          if (contactIds.length > 0) {
            const { data: tps, error: tpError } = await supabase
              .from('touchpoints')
              .select('type, completed_at, outcome, district_contact_id')
              .in('district_contact_id', contactIds)

            if (!tpError && tps) {
              touchpoints = tps
            }
          }

          // Attach data to campaign
          (campaignData as any).district_leads = districtLeads.map(dl => ({
            ...dl,
            district_contacts: districtContacts
              .filter(c => c.district_lead_id === dl.id)
              .map(c => ({
                ...c,
                touchpoints: touchpoints.filter(tp => tp.district_contact_id === c.id)
              }))
          }))
        }
      } else {
        // Fetch regular leads
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, status')
          .eq('campaign_id', campaignId)

        if (!leadsError && leads) {
          // Fetch touchpoints for leads
          const leadIds = leads.map(l => l.id)
          let touchpoints: any[] = []
          
          if (leadIds.length > 0) {
            const { data: tps, error: tpError } = await supabase
              .from('touchpoints')
              .select('type, completed_at, outcome, lead_id')
              .in('lead_id', leadIds)

            if (!tpError && tps) {
              touchpoints = tps
            }
          }

          // Attach data to campaign
          (campaignData as any).leads = leads.map(lead => ({
            ...lead,
            touchpoints: touchpoints.filter(tp => tp.lead_id === lead.id)
          }))
        }
      }

      if (campaignData) {
        let leadCount = 0
        let allTouchpoints: any[] = []
        let engagedCount = 0
        let wonCount = 0

        if (selectedCompany === 'Avalern') {
          // Handle district_leads data structure
          const districtLeads = (campaignData as any).district_leads || []
          leadCount = districtLeads.reduce((total: number, district: any) => 
            total + (district.district_contacts?.length || 0), 0)
          
          // Flatten touchpoints from all district contacts
          allTouchpoints = districtLeads.flatMap((districtLead: any) =>
            districtLead.district_contacts?.flatMap((contact: any) => contact.touchpoints || []) || []
          )
          
          engagedCount = districtLeads.filter((dl: any) => dl.status === 'engaged').length
          wonCount = districtLeads.filter((dl: any) => dl.status === 'won').length
        } else {
          // Handle regular leads data structure
          const leads = (campaignData as any).leads || []
          leadCount = leads.length
          
          // Flatten touchpoints from all leads
          allTouchpoints = leads.flatMap((lead: any) => lead.touchpoints || [])
          
          engagedCount = leads.filter((lead: any) => lead.status === 'engaged').length
          wonCount = leads.filter((lead: any) => lead.status === 'won').length
        }
        
        const emailsSent = allTouchpoints.filter((tp: any) => tp.type === 'email' && tp.completed_at && tp.outcome).length
        const callsMade = allTouchpoints.filter((tp: any) => tp.type === 'call' && tp.completed_at && tp.outcome).length
        const linkedinMessages = allTouchpoints.filter((tp: any) => tp.type === 'linkedin_message' && tp.completed_at && tp.outcome).length
        
        const conversionRate = leadCount > 0 ? Number(((wonCount / leadCount) * 100).toFixed(1)) : 0

        const enrichedCampaign = {
          ...campaignData,
          leadCount,
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

        setCampaign(enrichedCampaign)
        setEditFormData({
          name: campaignData.name,
          company: campaignData.company,
          start_date: campaignData.start_date || campaignData.created_at.split('T')[0],
          end_date: campaignData.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: campaignData.description || '',
          instantly_campaign_id: campaignData.instantly_campaign_id || '',
          status: campaignData.status || 'active'
        })
        
        // Fetch sequence steps if there's an outreach sequence
        if (campaignData.outreach_sequence_id) {
          fetchSequenceSteps(campaignData.outreach_sequence_id)
        }
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOutreachSequences = async () => {
    if (!selectedCompany) {
      console.warn('No company selected, skipping outreach sequences fetch')
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

  const fetchCampaignLeads = async () => {
    setLoadingLeads(true)
    try {
      if (campaign?.company === 'Avalern') {
        // For Avalern campaigns, fetch district contacts instead of leads
        const { data: districtContacts, error: contactError } = await supabase
          .from('district_contacts')
          .select(`
            id, first_name, last_name, title, email, phone, status, notes,
            district_lead:district_leads!inner(id, district_name, campaign_id)
          `)
          .eq('district_lead.campaign_id', campaignId)

        if (contactError) {
          console.error('Error fetching campaign district contacts:', contactError)
          return
        }

                 // Transform district contacts to match lead structure
        const transformedContacts = (districtContacts || []).map((contact: any) => ({
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          company: contact.district_lead?.district_name || '',
          status: 'not_contacted', // District contacts use different status system
          notes: contact.notes,
          title: contact.title,
          city: '', // District contacts don't have city/state
          state: '',
          linkedin_url: '',
          website_url: '',
          source: 'District Import',
          contact_attempts_count: 0,
          last_contacted_at: null,
          is_district_contact: true
        }))

        setCampaignLeads(transformedContacts)
      } else {
        // For CraftyCode campaigns, fetch regular leads
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
            last_contacted_at: lastAttempt?.completed_at || null,
            is_district_contact: false
          }
        })

        setCampaignLeads(processedLeads)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const fetchCampaignTouchpoints = async () => {
    setLoadingTouchpoints(true)
    try {
      if (campaign?.company === 'Avalern') {
        // For Avalern campaigns, fetch touchpoints for district contacts
        const { data: touchpoints, error } = await supabase
          .from('touchpoints')
          .select(`
            *,
            district_contact:district_contacts!inner(
              id,
              first_name,
              last_name,
              email,
              district_lead:district_leads!inner(
                id,
                campaign_id
              )
            )
          `)
          .eq('district_contact.district_lead.campaign_id', campaignId)
          .order('scheduled_at', { ascending: true })

        if (error) {
          console.error('Error fetching campaign touchpoints for district contacts:', error)
        } else {
          setCampaignTouchpoints(touchpoints || [])
        }
      } else {
        // For CraftyCode campaigns, fetch touchpoints for regular leads
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
                  {/* District Contacts View */}
                  {(campaign.company !== 'Avalern' || contactTab === 'contacts') && (
                    <div className="flex gap-6">
                      {/* Main Leads Table */}
                      <div className={`transition-all duration-300 ${selectedLeadForEdit ? 'w-1/2' : 'w-full'}`}>
                        <div className="space-y-6">
                          {/* Campaign Leads Table */}
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {campaign.company === 'Avalern' ? 'Touchpoints' : 'Contact Attempts'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {campaignLeads.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    {campaign.company === 'Avalern' 
                                      ? 'No district contacts found for this campaign' 
                                      : 'No leads assigned to this campaign'
                                    }
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
                                      {lead.is_district_contact ? (
                                        // District contact view
                                        <div>
                                          <div className="text-sm text-gray-900 font-medium">
                                            {lead.company}
                                          </div>
                                          {lead.title && (
                                            <div className="text-sm text-gray-500">{lead.title}</div>
                                          )}
                                        </div>
                                      ) : (
                                        // Regular lead view
                                        <div>
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
                                              <span className="text-gray-500">N/A</span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4">
                                      {campaign.company === 'Avalern' ? (
                                        // Show touchpoints for Avalern
                                        <div className="flex flex-col space-y-1">
                                          {(() => {
                                            const counts = getTouchpointCounts(lead.id)
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
                                      ) : (
                                        // Show contact attempts for CraftyCode
                                        <div className="flex items-center text-sm text-gray-900">
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {lead.contact_attempts_count || 0} attempts
                                          </span>
                                        </div>
                                      )}
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
                            {selectedLeadForEdit?.is_district_contact && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={editingLeadData.title || ''}
                                  onChange={(e) => setEditingLeadData({...editingLeadData, title: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location & Company/District */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">
                            {selectedLeadForEdit?.is_district_contact ? 'Location & District' : 'Location & Company'}
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {!selectedLeadForEdit?.is_district_contact && (
                              <>
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
                              </>
                            )}
                            {selectedLeadForEdit?.is_district_contact && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                                <input
                                  type="text"
                                  value={editingLeadData.company || ''}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">District information is managed separately</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <h3 className="text-md font-medium text-gray-900 mb-3">Status</h3>
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

                                {/* Districts View for Avalern */}
                {campaign.company === 'Avalern' && contactTab === 'districts' && (
                  <div className="flex gap-6">
                    {/* Main Districts Table */}
                    <div className={`transition-all duration-300 ${selectedDistrictForEdit ? 'w-1/2' : 'w-full'}`}>
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Campaign Districts ({campaignDistricts.length})
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">County</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Contacts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added Date</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {campaignDistricts.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No districts assigned to this campaign
                                  </td>
                                </tr>
                              ) : (
                                campaignDistricts.map((district) => (
                                  <tr key={district.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenDistrictEditPanel(district)}>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                          <Target className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {district.district_name}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">{district.county || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        district.status === 'actively_contacting' ? 'bg-blue-100 text-blue-800' :
                                        district.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        district.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {district.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900">{district.total_contacts}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm font-medium text-gray-900">{district.valid_contacts}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">
                                        {new Date(district.created_at).toLocaleDateString()}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* District Edit Panel */}
                    {selectedDistrictForEdit && editingDistrictData && (
                      <div className="w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">
                              Edit {selectedDistrictForEdit.district_name}
                            </h2>
                            <button
                              onClick={handleCloseDistrictEditPanel}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-6 w-6" />
                            </button>
                          </div>
                        </div>

                        <div className="px-6 py-4 space-y-6 max-h-[80vh] overflow-y-auto">
                          {/* Basic Information */}
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">District Information</h3>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">District Name</label>
                                <input
                                  type="text"
                                  value={editingDistrictData.district_name || ''}
                                  onChange={(e) => setEditingDistrictData({...editingDistrictData, district_name: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                <input
                                  type="text"
                                  value={editingDistrictData.county || ''}
                                  onChange={(e) => setEditingDistrictData({...editingDistrictData, county: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                  value={editingDistrictData.status || ''}
                                  onChange={(e) => setEditingDistrictData({...editingDistrictData, status: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="actively_contacting">Actively Contacting</option>
                                  <option value="completed">Completed</option>
                                  <option value="paused">Paused</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Contact Statistics */}
                          <div>
                            <h3 className="text-md font-medium text-gray-900 mb-3">Contact Statistics</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Total Contacts</div>
                                <div className="text-xl font-semibold text-gray-900">{selectedDistrictForEdit.total_contacts}</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-sm text-gray-600">Valid Contacts</div>
                                <div className="text-xl font-semibold text-green-600">{selectedDistrictForEdit.valid_contacts}</div>
                              </div>
                            </div>
                          </div>

                          {/* Save Button */}
                          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={handleCloseDistrictEditPanel}
                              className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateDistrictInCampaign}
                              disabled={updatingDistrict}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {updatingDistrict ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
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
                        {campaignTouchpoints.map((touchpoint) => {
                          // Handle different data structures for CraftyCode vs Avalern
                          const contact = touchpoint.lead || touchpoint.district_contact
                          const contactEmail = contact?.email
                          
                          return (
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
                                  <span className="font-medium">
                                    {contact?.first_name} {contact?.last_name}
                                  </span>
                                  {touchpoint.district_contact && (
                                    <span className="text-xs text-gray-500">
                                      ({touchpoint.district_contact.district_lead?.district_name})
                                    </span>
                                  )}
                                </div>
                                {touchpoint.subject && (
                                  <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                                )}
                                <div className="flex items-center space-x-4 mt-1">
                                  {contactEmail && (
                                    <p className="text-xs text-gray-500">{contactEmail}</p>
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