'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { Calendar, Phone, Mail, MessageSquare, Plus, Target, Edit2, Trash2, List, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import CalendarPopup from '../../components/CalendarPopup'
import LeadDetailPanel from '../../components/leads/LeadDetailPanel'
import { Lead, STATUS_DISPLAY_MAP } from '../../types/leads'
import { getCurrentDateString, createDateRangeForDate, formatDateToLocalString, debugDateInfo } from '../../utils/date-utils'

interface TouchpointSummary {
  today?: {
    total: number
    by_type: Record<string, number>
    touchpoints: any[]
  }
  overdue?: {
    total: number
    by_type: Record<string, number>
    touchpoints: any[]
  }
  summary?: {
    total_due: number
    emails_due: number
    calls_due: number
    linkedin_due: number
  }
  // For specific date queries
  touchpoints?: any[]
  date?: string
  total?: number
}

interface BatchInfo {
  available_leads_count: number
  next_batch_date: string
  campaign?: any
}

interface OutreachSequence {
  id: string
  name: string
  company: string
  description?: string
  created_at: string
  steps?: OutreachStep[]
}

interface OutreachStep {
  id: string
  sequence_id: string
  step_order: number
  type: string
  name?: string
  content_link?: string
  day_offset: number
}

interface SequenceFormData {
  name: string
  company: string
  description: string
  steps: {
    type: 'email' | 'call' | 'linkedin_message'
    name: string
    content_link: string
    day_offset: number
  }[]
}

// Update the ExtendedLead interface to include all needed properties
interface ExtendedLead extends Lead {
  is_district_contact?: boolean;
  district_contact_id?: string;
  district_lead_id?: string;
  title?: string;
}

export default function OutreachPage() {
  const { selectedCompany } = useCompany()
  // Default to Avalern if selectedCompany is empty
  const effectiveCompany = selectedCompany || 'Avalern'
  
  const [touchpoints, setTouchpoints] = useState<TouchpointSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [selectedDate, setSelectedDate] = useState(getCurrentDateString()) // YYYY-MM-DD format
  const [touchpointCounts, setTouchpointCounts] = useState<Record<string, number>>({})
  const [selectedType, setSelectedType] = useState('')
  const [campaigns, setCampaigns] = useState<any[]>([]) // Initialize as empty array
  const [filteredTouchpoints, setFilteredTouchpoints] = useState<any[]>([])
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [selectedLead, setSelectedLead] = useState<ExtendedLead | null>(null)
  const [editingLead, setEditingLead] = useState<ExtendedLead | null>(null)
  const [saving, setSaving] = useState(false)
  const [leadTouchpoints, setLeadTouchpoints] = useState<any[]>([])
  const [showNewTouchpointForm, setShowNewTouchpointForm] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState<any>({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  
  // User state for filtering
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [creatorFilter, setCreatorFilter] = useState('')
  const [users, setUsers] = useState<any[]>([])
  
  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            setIsAdmin(data.user.role === 'admin');
            
            // For member users, default to filtering by their own touchpoints
            if (data.user.role === 'member') {
              setCreatorFilter(data.user.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Fetch users for filtering
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

  // Define fetchFilteredTouchpoints before using it in useEffect
  const fetchFilteredTouchpoints = useCallback(async () => {
    setLoading(true);
    try {
      // Build query parameters for specific date and load touchpoints
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      params.append('company', effectiveCompany);
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign);
      }
      if (creatorFilter) {
        params.append('created_by_id', creatorFilter);
      }

      // For Avalern, we need to fetch all touchpoints across all campaigns
      let touchpointsData;
      if (effectiveCompany === 'Avalern') {
        // First, get all Avalern campaigns
        const campaignsResponse = await fetch(`/api/campaigns?company=Avalern`);
        
        if (!campaignsResponse.ok) {
          console.error('Error fetching Avalern campaigns:', campaignsResponse.status);
          throw new Error(`Failed to fetch Avalern campaigns: ${campaignsResponse.status}`);
        }
        
        const campaignsData = await campaignsResponse.json();
        const allCampaigns = campaignsData.campaigns || [];
        
        console.log(`Found ${allCampaigns.length} Avalern campaigns to fetch touchpoints for`);
        
        // Initialize empty touchpoints array
        let allTouchpoints: any[] = [];
        
        // If a specific campaign is selected, only fetch touchpoints for that campaign
        const campaignsToFetch = selectedCampaign 
          ? allCampaigns.filter((c: { id: string }) => c.id === selectedCampaign)
          : allCampaigns;
          
        // Ensure campaignsToFetch is always an array
        const campaignsArray = Array.isArray(campaignsToFetch) ? campaignsToFetch : [];
        
        // Fetch touchpoints for each campaign
        for (const campaign of campaignsArray) {
          try {
            const campaignTouchpointsResponse = await fetch(`/api/campaign-touchpoints?campaign_id=${campaign.id}${creatorFilter ? `&created_by_id=${creatorFilter}` : ''}`);
            
            if (campaignTouchpointsResponse.ok) {
              const campaignTouchpointsData = await campaignTouchpointsResponse.json();
              if (campaignTouchpointsData.touchpoints && campaignTouchpointsData.touchpoints.length > 0) {
                console.log(`Found ${campaignTouchpointsData.touchpoints.length} touchpoints for campaign ${campaign.name}`);
                allTouchpoints = [...allTouchpoints, ...campaignTouchpointsData.touchpoints];
              }
            } else {
              console.error(`Error fetching touchpoints for campaign ${campaign.id}:`, campaignTouchpointsResponse.status);
            }
          } catch (error) {
            console.error(`Error processing touchpoints for campaign ${campaign.id}:`, error);
          }
        }
        
        // Filter touchpoints by date using local timezone
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);
        const nextDay = new Date(selectedDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const filteredByDate = allTouchpoints.filter((tp: any) => {
          const tpDate = new Date(tp.scheduled_at || tp.completed_at);
          // Convert to local date for comparison
          const tpLocalDate = new Date(tpDate.getFullYear(), tpDate.getMonth(), tpDate.getDate());
          return tpLocalDate >= selectedDateObj && tpLocalDate < nextDay;
        });
        
        touchpointsData = {
          touchpoints: filteredByDate,
          total: filteredByDate.length,
          company: 'Avalern'
        };
        
        console.log(`Filtered to ${filteredByDate.length} touchpoints for selected date ${selectedDate}`);
      } else {
        // Use the regular daily-touchpoints API for non-Avalern companies
        const touchpointsResponse = await fetch(`/api/daily-touchpoints?${params.toString()}`);
        
        if (!touchpointsResponse.ok) {
          console.error('Error fetching touchpoints:', touchpointsResponse.status);
          if (touchpointsResponse.status === 401) {
            alert('You are not authorized to access this data. Please log in again.');
            setLoading(false);
            return;
          }
          if (touchpointsResponse.status === 403) {
            alert('You do not have permission to access this company data.');
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch touchpoints: ${touchpointsResponse.status}`);
        }
        
        touchpointsData = await touchpointsResponse.json();
      }
      
      // Debug log to see what we're getting back
      console.log('Touchpoints API response:', {
        company: effectiveCompany,
        touchpointsCount: touchpointsData.touchpoints?.length || 0,
        sampleTouchpoint: touchpointsData.touchpoints && touchpointsData.touchpoints.length > 0 ? touchpointsData.touchpoints[0] : null
      });
      
      // Fetch counts separately
      await fetchTouchpointCounts();
      
      // Apply type filter if selected
      let allTouchpoints = touchpointsData.touchpoints || [];
      if (selectedType) {
        allTouchpoints = allTouchpoints.filter((tp: any) => tp.type === selectedType);
      }

      // Calculate total pages for pagination
      const total = allTouchpoints.length;
      const pages = Math.max(1, Math.ceil(total / itemsPerPage));
      
      // Reset to page 1 when filters change
      setCurrentPage(1);
      setTotalPages(pages);

      // Update all states at once to reduce re-renders
      setFilteredTouchpoints(allTouchpoints);
      setTouchpoints({
        ...touchpointsData,
        touchpoints: allTouchpoints,
        total: allTouchpoints.length
      });
    } catch (error) {
      console.error('Error fetching touchpoints:', error);
      alert('Failed to load touchpoints. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedType, selectedCampaign, creatorFilter, effectiveCompany]);

  // A single effect to load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load data in parallel
        const campaignsResponse = await fetch(`/api/campaigns?company=${effectiveCompany}`);
        
        if (!campaignsResponse.ok) {
          console.error('Error loading campaigns:', campaignsResponse.status);
          if (campaignsResponse.status === 401) {
            alert('You are not authorized to access this data. Please log in again.');
            return;
          }
          if (campaignsResponse.status === 403) {
            alert('You do not have permission to access this company data.');
            return;
          }
          throw new Error(`Failed to load campaigns: ${campaignsResponse.status}`);
        }
        
        const campaignsData = await campaignsResponse.json();
        // Ensure campaigns is always an array
        setCampaigns(Array.isArray(campaignsData.campaigns) ? campaignsData.campaigns : []);

        // Now that we have campaigns, we can load the filtered touchpoints
        await fetchFilteredTouchpoints();
      } catch (error) {
        console.error('Error loading initial data:', error);
        alert('Failed to load data. Please try again later.');
      }
    };
    
    loadInitialData();
  }, [effectiveCompany]);

  // Effect for filters only - only run when not loading and filters change
  useEffect(() => {
    if (!loading) {
      fetchFilteredTouchpoints();
    }
  }, [selectedDate, selectedType, selectedCampaign, creatorFilter, effectiveCompany]);

  const fetchTouchpointCounts = useCallback(async () => {
    try {
      // Fetch touchpoint counts for the current month
      const startOfMonth = new Date(selectedDate);
      startOfMonth.setDate(1);
      const endOfMonth = new Date(selectedDate);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      const params = new URLSearchParams();
      params.append('startDate', formatDateToLocalString(startOfMonth));
      params.append('endDate', formatDateToLocalString(endOfMonth));
      params.append('company', effectiveCompany);
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign);
      }

      console.log('Fetching touchpoint counts with params:', Object.fromEntries(params.entries()));

      // For Avalern, fetch touchpoints for all campaigns and calculate counts
      if (effectiveCompany === 'Avalern') {
        try {
          // First, get all Avalern campaigns
          const campaignsResponse = await fetch(`/api/campaigns?company=Avalern`);
          
          if (!campaignsResponse.ok) {
            console.error('Error fetching Avalern campaigns for counts:', campaignsResponse.status);
            return null;
          }
          
          const campaignsData = await campaignsResponse.json();
          const allCampaigns = campaignsData.campaigns || [];
          
          // Initialize empty touchpoints array
          let allTouchpoints: any[] = [];
          
          // If a specific campaign is selected, only fetch touchpoints for that campaign
          const campaignsToFetch = selectedCampaign 
            ? allCampaigns.filter((c: { id: string }) => c.id === selectedCampaign)
            : allCampaigns;
            
          // Ensure campaignsToFetch is always an array
          const campaignsArray = Array.isArray(campaignsToFetch) ? campaignsToFetch : [];
            
          // Fetch touchpoints for each campaign
          for (const campaign of campaignsArray) {
            try {
              const campaignTouchpointsResponse = await fetch(`/api/campaign-touchpoints?campaign_id=${campaign.id}`);
              
              if (campaignTouchpointsResponse.ok) {
                const campaignTouchpointsData = await campaignTouchpointsResponse.json();
                if (campaignTouchpointsData.touchpoints && campaignTouchpointsData.touchpoints.length > 0) {
                  allTouchpoints = [...allTouchpoints, ...campaignTouchpointsData.touchpoints];
                }
              }
            } catch (error) {
              console.error(`Error processing touchpoints for campaign ${campaign.id} counts:`, error);
            }
          }
          
          // Group touchpoints by date using local timezone
          const countsByDate: Record<string, number> = {};
          allTouchpoints.forEach((tp: any) => {
            const date = new Date(tp.scheduled_at || tp.completed_at);
            // Convert to local date for comparison
            const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            if (localDate >= startOfMonth && localDate <= endOfMonth) {
              const dateStr = formatDateToLocalString(localDate);
              countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
            }
          });
          
          console.log('Calculated touchpoint counts from all campaigns:', countsByDate);
          setTouchpointCounts(countsByDate);
          return null;
        } catch (error) {
          console.error('Error calculating touchpoint counts from all campaigns:', error);
          // Fall back to regular API if this fails
        }
      }
      
      // Use regular touchpoint-counts API for non-Avalern
      const response = await fetch(`/api/touchpoint-counts?${params.toString()}`);
      
      if (!response.ok) {
        console.error('Error fetching touchpoint counts:', response.status);
        if (response.status === 401 || response.status === 403) {
          // Auth errors are already handled elsewhere
          return null;
        }
        throw new Error(`Failed to fetch touchpoint counts: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Received touchpoint counts:', result.counts);
      setTouchpointCounts(result.counts || {});
      return response;
    } catch (error) {
      console.error('Error fetching touchpoint counts:', error);
      return null;
    }
  }, [selectedDate, selectedCampaign, effectiveCompany]);

  const markTouchpointComplete = async (touchpointId: string, status: string) => {
    try {
      console.log(`Marking touchpoint ${touchpointId} as ${status}`);
      
      // Find the touchpoint in our local state to get more details
      const touchpoint = filteredTouchpoints.find(tp => tp.id === touchpointId);
      if (!touchpoint) {
        console.error('Could not find touchpoint in local state:', touchpointId);
        alert('Could not find touchpoint details. Please refresh the page and try again.');
        return;
      }
      
      console.log('Touchpoint details for completion:', {
        id: touchpoint.id,
        type: touchpoint.type,
        company: effectiveCompany,
        hasLead: !!touchpoint.lead,
        hasContact: !!touchpoint.contact,
        hasDistrictContact: !!touchpoint.district_contact
      });
      
      const response = await fetch('/api/touchpoints', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: touchpointId,
          status,
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Error updating touchpoint:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        alert('Failed to update touchpoint status. Please try again.');
        return;
      }

      console.log('Successfully marked touchpoint as complete');
      
      // Refresh touchpoints data
      await fetchFilteredTouchpoints();
      await fetchTouchpointCounts();
      
      // If we have a selected lead, refresh its touchpoints
      if (selectedLead?.id) {
        if (effectiveCompany === 'Avalern' && (selectedLead.is_district_contact || selectedLead.district_contact_id)) {
          await fetchDistrictContactTouchpoints(selectedLead.id);
        } else {
          await fetchLeadTouchpoints(selectedLead.id);
        }
      }
    } catch (error) {
      console.error('Error updating touchpoint:', error);
      alert('Failed to update touchpoint status. Please check console for details.');
    }
  };

  const handleCalendarMonthChange = useCallback(async (startDate: string, endDate: string) => {
    try {
      // For Avalern, use the same approach as fetchTouchpointCounts
      if (effectiveCompany === 'Avalern') {
        // First, get all Avalern campaigns
        const campaignsResponse = await fetch(`/api/campaigns?company=Avalern`);
        
        if (!campaignsResponse.ok) {
          console.error('Error fetching Avalern campaigns for calendar:', campaignsResponse.status);
          return;
        }
        
        const campaignsData = await campaignsResponse.json();
        const allCampaigns = campaignsData.campaigns || [];
        
        // Initialize empty touchpoints array
        let allTouchpoints: any[] = [];
        
        // If a specific campaign is selected, only fetch touchpoints for that campaign
        const campaignsToFetch = selectedCampaign 
          ? allCampaigns.filter((c: { id: string }) => c.id === selectedCampaign)
          : allCampaigns;
          
        // Ensure campaignsToFetch is always an array
        const campaignsArray = Array.isArray(campaignsToFetch) ? campaignsToFetch : [];
          
        // Fetch touchpoints for each campaign
        for (const campaign of campaignsArray) {
          try {
            const campaignTouchpointsResponse = await fetch(`/api/campaign-touchpoints?campaign_id=${campaign.id}`);
            
            if (campaignTouchpointsResponse.ok) {
              const campaignTouchpointsData = await campaignTouchpointsResponse.json();
              if (campaignTouchpointsData.touchpoints && campaignTouchpointsData.touchpoints.length > 0) {
                allTouchpoints = [...allTouchpoints, ...campaignTouchpointsData.touchpoints];
              }
            }
          } catch (error) {
            console.error(`Error processing touchpoints for campaign ${campaign.id} calendar:`, error);
          }
        }
        
        // Parse the start and end dates
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        // Group touchpoints by date using local timezone
        const countsByDate: Record<string, number> = {};
        allTouchpoints.forEach((tp: any) => {
          const date = new Date(tp.scheduled_at || tp.completed_at);
          // Convert to local date for comparison
          const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          if (localDate >= startDateObj && localDate <= endDateObj) {
            const dateStr = formatDateToLocalString(localDate);
            countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
          }
        });
        
        console.log('Calendar month change: calculated counts from all campaigns:', countsByDate);
        setTouchpointCounts(countsByDate);
        return;
      }
      
      // For non-Avalern, use the original approach
      const params = new URLSearchParams()
      params.append('startDate', startDate)
      params.append('endDate', endDate)
      params.append('company', effectiveCompany)
      if (selectedCampaign) {
        params.append('campaignId', selectedCampaign)
      }

      console.log('Calendar month change: fetching counts for', { startDate, endDate, company: effectiveCompany });
      const response = await fetch(`/api/touchpoint-counts?${params.toString()}`)
      
      if (!response.ok) {
        console.error('Error fetching touchpoint counts:', response.status);
        if (response.status === 401 || response.status === 403) {
          // Auth errors are already handled elsewhere
          return;
        }
        throw new Error(`Failed to fetch touchpoint counts: ${response.status}`);
      }
      
      const result = await response.json()
      console.log('Calendar month change: received counts:', result.counts);
      setTouchpointCounts(result.counts || {})
    } catch (error) {
      console.error('Error fetching touchpoint counts for calendar month change:', error)
    }
  }, [effectiveCompany, selectedCampaign]);

  const handleTouchpointClick = (touchpoint: any) => {
    console.log('Touchpoint clicked:', touchpoint);
    
    // For Avalern, use district_contact info; for others, use lead info
    const isAvalern = effectiveCompany === 'Avalern';
    let lead: ExtendedLead | null = null;
    
    if (isAvalern && touchpoint.contact) {
      // Create a lead-like object from contact for consistency (using the campaign-touchpoints API format)
      lead = {
        id: touchpoint.district_contact_id,
        first_name: touchpoint.contact.first_name || '',
        last_name: touchpoint.contact.last_name || '',
        email: touchpoint.contact.email || '',
        phone: touchpoint.contact.phone || '',
        title: touchpoint.contact.title || '',
        company: touchpoint.contact.company || '',
        city: touchpoint.contact.city || '',
        state: touchpoint.contact.state || 'CA', // Default for Avalern
        district_contact_id: touchpoint.district_contact_id,
        is_district_contact: true,
        status: 'active', // Default status
        campaign_id: touchpoint.campaign_id,
        created_at: touchpoint.contact.created_at || new Date().toISOString()
      };
      
      // If campaign info exists, add it separately to avoid type errors
      if (touchpoint.campaign) {
        (lead as any).campaign = {
          id: touchpoint.campaign_id,
          name: touchpoint.campaign.name || 'Unknown Campaign',
          company: touchpoint.campaign.company || '',
          created_at: touchpoint.campaign.created_at || new Date().toISOString()
        };
      }
    } else if (isAvalern && touchpoint.district_contact) {
      // Handle the old format for backward compatibility
      lead = {
        id: touchpoint.district_contact.id,
        first_name: touchpoint.district_contact.first_name || '',
        last_name: touchpoint.district_contact.last_name || '',
        email: touchpoint.district_contact.email || '',
        phone: touchpoint.district_contact.phone || '',
        title: touchpoint.district_contact.title || '',
        company: touchpoint.district_contact.district_lead?.district_name || '',
        city: touchpoint.district_contact.district_lead?.county || '',
        state: 'CA', // Default for Avalern
        campaign_id: touchpoint.district_contact.district_lead?.campaign_id,
        campaign: touchpoint.district_contact.district_lead?.campaign,
        district_contact_id: touchpoint.district_contact.id,
        district_lead_id: touchpoint.district_contact.district_lead_id,
        status: 'active', // Default status
        is_district_contact: true,
        created_at: touchpoint.district_contact.created_at || new Date().toISOString()
      };
    } else if (touchpoint.lead) {
      // Regular CraftyCode lead format
      lead = {
        ...touchpoint.lead,
        created_at: touchpoint.lead.created_at || new Date().toISOString(),
        status: touchpoint.lead.status || 'active'
      } as ExtendedLead;
    } else {
      console.error('No lead or contact information found for touchpoint:', touchpoint);
      alert('Could not find contact information for this touchpoint.');
      return;
    }

    if (!lead) {
      console.error('Failed to create lead object from touchpoint:', touchpoint);
      return;
    }

    console.log('Selected lead/contact:', lead);
    setSelectedLead(lead);
    setEditingLead({ ...lead });
    
    // Fetch touchpoints for this lead or contact
    if (isAvalern && (lead.district_contact_id || lead.is_district_contact)) {
      fetchDistrictContactTouchpoints(lead.id);
    } else {
      fetchLeadTouchpoints(lead.id);
    }
  }

  // Add new function to fetch touchpoints for a district contact
  const fetchDistrictContactTouchpoints = async (contactId: string) => {
    try {
      console.log(`Fetching touchpoints for district contact ID: ${contactId}`);
      const response = await fetch(`/api/touchpoints?district_contact_id=${contactId}&include_details=true`);
      
      if (!response.ok) {
        console.error('Error fetching district contact touchpoints:', response.status);
        setLeadTouchpoints([]);
        return;
      }
      
      const data = await response.json();
      console.log(`Received ${data.touchpoints?.length || 0} touchpoints for district contact`);
      
      // Debug the first touchpoint to see its structure
      if (data.touchpoints && data.touchpoints.length > 0) {
        console.log('Sample touchpoint for district contact:', data.touchpoints[0]);
      }
      
      setLeadTouchpoints(data.touchpoints || []);
    } catch (error) {
      console.error('Error fetching district contact touchpoints:', error);
      setLeadTouchpoints([]);
    }
  }

  // Rename existing fetchTouchpoints to fetchLeadTouchpoints for clarity
  const fetchLeadTouchpoints = async (leadId: string) => {
    try {
      const response = await fetch(`/api/touchpoints?lead_id=${leadId}&include_details=true`);
      
      if (!response.ok) {
        console.error('Error fetching lead touchpoints:', response.status);
        setLeadTouchpoints([]);
        return;
      }
      
      const data = await response.json();
      setLeadTouchpoints(data.touchpoints || []);
    } catch (error) {
      console.error('Error fetching lead touchpoints:', error);
      setLeadTouchpoints([]);
    }
  }

  const handleCloseLead = () => {
    setSelectedLead(null)
    setEditingLead(null)
    setLeadTouchpoints([])
    setShowNewTouchpointForm(false)
    setNewTouchpoint({})
  }

  const handleSaveLead = async () => {
    if (!editingLead) return

    setSaving(true)
    try {
      console.log('Saving lead/contact:', editingLead)
      
      if (editingLead.is_district_contact || editingLead.district_contact_id) {
        // Save district contact
        const response = await fetch(`/api/district-contacts/${editingLead.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: editingLead.first_name,
            last_name: editingLead.last_name,
            email: editingLead.email,
            phone: editingLead.phone,
            title: editingLead.title,
            status: editingLead.status,
            notes: editingLead.notes
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update district contact: ${response.status}`)
        }

        const updatedContact = await response.json()
        console.log('District contact updated:', updatedContact)
      } else {
        // Save regular lead (implement if needed)
        console.log('Regular lead saving not implemented yet')
      }
      
      // Refresh touchpoints data
      await fetchFilteredTouchpoints()
      
      alert('Contact updated successfully!')
      handleCloseLead()
    } catch (error) {
      console.error('Error saving lead/contact:', error)
      alert('Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  const handleExportTouchpoints = () => {
    if (!filteredTouchpoints || filteredTouchpoints.length === 0) {
      alert('No touchpoints to export')
      return
    }

    // Create CSV headers based on company type
    const headers = effectiveCompany === 'Avalern' 
      ? ['First Name', 'Last Name', 'Email', 'Phone', 'Title', 'District', 'County', 'Touchpoint Type', 'Subject', 'Scheduled Date', 'Status', 'Campaign']
      : ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Touchpoint Type', 'Subject', 'Scheduled Date', 'Status', 'Campaign']

    // Create CSV rows
    const csvRows = filteredTouchpoints.map(touchpoint => {
      if (effectiveCompany === 'Avalern') {
        // Avalern uses district_contacts or the new contact format
        let firstName = '', lastName = '', email = '', phone = '', title = '', district = '', county = '', campaignName = '';
        
        if (touchpoint.contact) {
          // New format from campaign-touchpoints API
          firstName = touchpoint.contact.first_name || '';
          lastName = touchpoint.contact.last_name || '';
          email = touchpoint.contact.email || '';
          phone = touchpoint.contact.phone || '';
          title = touchpoint.contact.title || '';
          district = touchpoint.contact.company || '';
          county = touchpoint.contact.city || '';
          campaignName = touchpoint.campaign?.name || '';
        } else if (touchpoint.district_contact) {
          // Old format for backward compatibility
          firstName = touchpoint.district_contact.first_name || '';
          lastName = touchpoint.district_contact.last_name || '';
          email = touchpoint.district_contact.email || '';
          phone = touchpoint.district_contact.phone || '';
          title = touchpoint.district_contact.title || '';
          district = touchpoint.district_contact.district_lead?.district_name || '';
          county = touchpoint.district_contact.district_lead?.county || '';
          campaignName = touchpoint.district_contact.district_lead?.campaign?.name || '';
        }
        
        return [
          firstName,
          lastName,
          email,
          phone,
          title,
          district,
          county,
          touchpoint.type || '',
          touchpoint.subject || '',
          touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : '',
          touchpoint.completed_at ? 'Completed' : 'Scheduled',
          campaignName
        ]
      } else {
        // CraftyCode uses leads
        const lead = touchpoint.lead || {};
        return [
          lead.first_name || '',
          lead.last_name || '',
          lead.email || '',
          lead.phone || '',
          lead.company || '',
          touchpoint.type || '',
          touchpoint.subject || '',
          touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : '',
          touchpoint.completed_at ? 'Completed' : 'Scheduled',
          lead.campaign?.name || ''
        ]
      }
    })

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename with date and company
    const dateStr = selectedDate || getCurrentDateString()
    const filename = `${effectiveCompany.toLowerCase()}_touchpoints_${dateStr}.csv`
    link.setAttribute('download', filename)
    
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Function to get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTouchpoints.slice(startIndex, endIndex);
  };

  // Function to handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Display a loading state while fetching data
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading touchpoints...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Daily Touchpoints</h1>
            <p className="text-gray-600">Manage scheduled touchpoints for {effectiveCompany}</p>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-1">
              Debug: Selected Date: {selectedDate} | Current: {getCurrentDateString()} | 
              {(() => {
                const debug = debugDateInfo();
                return ` TZ: ${debug.timezone} | ISO: ${debug.toISOStringDate}`;
              })()}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/outreach-sequences"
              className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <List className="h-4 w-4 mr-2" />
              View Sequences
            </Link>
          </div>
        </div>

        {/* Touchpoints Content */}
        <div className="flex gap-6">
          <div className={selectedLead ? 'flex-1' : 'w-full'}>
            {/* Summary Cards */}
            {touchpoints && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.total_due || touchpoints.total || filteredTouchpoints.length}
                      </p>
                      <p className="text-sm text-gray-600">Total Due Selected Date</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Mail className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.emails_due || filteredTouchpoints.filter(tp => tp.type === 'email').length}
                      </p>
                      <p className="text-sm text-gray-600">Emails Due</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <Phone className="h-8 w-8 text-orange-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.calls_due || filteredTouchpoints.filter(tp => tp.type === 'call').length}
                      </p>
                      <p className="text-sm text-gray-600">Calls Due</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {touchpoints.summary?.linkedin_due || filteredTouchpoints.filter(tp => tp.type === 'linkedin_message').length}
                      </p>
                      <p className="text-sm text-gray-600">LinkedIn Messages</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
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
                    {Array.isArray(campaigns) && campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Creator Filter - Only show for admins */}
                {isAdmin && users.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                    <select
                      value={creatorFilter}
                      onChange={(e) => setCreatorFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Users</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Touchpoints Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Touchpoints</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="5">5 per page</option>
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                    </select>
                    <button
                      onClick={handleExportTouchpoints}
                      disabled={!filteredTouchpoints || filteredTouchpoints.length === 0}
                      className="flex items-center px-3 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {filteredTouchpoints.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No touchpoints found with current filters</p>
                ) : (
                  <div className="space-y-4">
                    {getCurrentPageItems().map((touchpoint) => {
                      // For Avalern, get contact info from the contact field (campaign-touchpoints API format)
                      const isAvalern = effectiveCompany === 'Avalern';
                      let contactName = 'Unknown Contact';
                      let contactEmail = '';
                      let campaignName = '';
                      
                      if (isAvalern) {
                        if (touchpoint.contact) {
                          // New format from campaign-touchpoints API
                          contactName = `${touchpoint.contact.first_name || ''} ${touchpoint.contact.last_name || ''}`.trim();
                          contactEmail = touchpoint.contact.email || '';
                          campaignName = touchpoint.contact.company || '';
                        } else if (touchpoint.district_contact) {
                          // Old format for backward compatibility
                          contactName = `${touchpoint.district_contact.first_name || ''} ${touchpoint.district_contact.last_name || ''}`.trim();
                          contactEmail = touchpoint.district_contact.email || '';
                          campaignName = touchpoint.district_contact.district_lead?.district_name || '';
                        }
                      } else {
                        // Regular leads format for CraftyCode
                        contactName = `${touchpoint.lead?.first_name || ''} ${touchpoint.lead?.last_name || ''}`.trim();
                        contactEmail = touchpoint.lead?.email || '';
                        campaignName = touchpoint.lead?.campaign?.name || '';
                      }
                      
                      return (
                        <div 
                          key={touchpoint.id} 
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleTouchpointClick(touchpoint)}
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
                              <span className="font-medium">{contactName || 'Unknown Contact'}</span>
                              {campaignName && (
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  {campaignName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-xs text-gray-500">{contactEmail}</p>
                              <p className="text-xs text-gray-500">
                                Scheduled: {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markTouchpointComplete(touchpoint.id, 'replied')
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Replied
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                markTouchpointComplete(touchpoint.id, 'no_answer')
                              }}
                              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                            >
                              No Answer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                        <div className="flex flex-1 justify-between sm:hidden">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredTouchpoints.length)}</span> to{' '}
                              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTouchpoints.length)}</span> of{' '}
                              <span className="font-medium">{filteredTouchpoints.length}</span> results
                            </p>
                          </div>
                          <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                              <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">First</span>
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                <ChevronLeft className="h-5 w-5 -ml-2" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                              </button>
                              
                              {/* Page numbers */}
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Show pages around the current page
                                let pageNum;
                                if (totalPages <= 5) {
                                  // If 5 or fewer pages, show all
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  // If near the start
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  // If near the end
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  // In the middle
                                  pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                      currentPage === pageNum
                                        ? 'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                              
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Last</span>
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                <ChevronRight className="h-5 w-5 -ml-2" aria-hidden="true" />
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overdue Touchpoints */}
          {touchpoints && touchpoints.overdue && touchpoints.overdue.total > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200">
              <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                <h3 className="text-lg font-semibold text-red-900">Overdue Touchpoints ({touchpoints.overdue.total})</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {touchpoints.overdue.touchpoints.map((touchpoint) => {
                    // For Avalern, get contact info from the contact field (campaign-touchpoints API format)
                    const isAvalern = effectiveCompany === 'Avalern';
                    let contactName = 'Unknown Contact';
                    let contactEmail = '';
                    let campaignName = '';
                    
                    if (isAvalern) {
                      if (touchpoint.contact) {
                        // New format from campaign-touchpoints API
                        contactName = `${touchpoint.contact.first_name || ''} ${touchpoint.contact.last_name || ''}`.trim();
                        contactEmail = touchpoint.contact.email || '';
                        campaignName = touchpoint.contact.company || '';
                      } else if (touchpoint.district_contact) {
                        // Old format for backward compatibility
                        contactName = `${touchpoint.district_contact.first_name || ''} ${touchpoint.district_contact.last_name || ''}`.trim();
                        contactEmail = touchpoint.district_contact.email || '';
                        campaignName = touchpoint.district_contact.district_lead?.district_name || '';
                      }
                    } else {
                      // Regular leads format for CraftyCode
                      contactName = `${touchpoint.lead?.first_name || ''} ${touchpoint.lead?.last_name || ''}`.trim();
                      contactEmail = touchpoint.lead?.email || '';
                      campaignName = touchpoint.lead?.campaign?.name || '';
                    }
                    
                    return (
                      <div 
                        key={touchpoint.id} 
                        className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 cursor-pointer transition-colors"
                        onClick={() => handleTouchpointClick(touchpoint)}
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
                            <span className="font-medium">{contactName || 'Unknown Contact'}</span>
                            {campaignName && (
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {campaignName}
                              </span>
                            )}
                            <span className="text-xs text-red-600">
                              Due: {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{touchpoint.subject}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-gray-500">{contactEmail}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'replied')
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Replied
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markTouchpointComplete(touchpoint.id, 'no_answer')
                            }}
                            className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                          >
                            No Answer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lead Detail Panel */}
        {selectedLead && (
          <div className="w-96 flex-shrink-0">
            <LeadDetailPanel
              selectedLead={editingLead || selectedLead}
              editingLead={editingLead || selectedLead}
              onEditingLeadChange={(lead) => setEditingLead(lead)}
              onClose={handleCloseLead}
              onSave={handleSaveLead}
              saving={saving}
              campaigns={campaigns}
              availableStatuses={Object.keys(STATUS_DISPLAY_MAP)}
              touchpoints={leadTouchpoints}
              showNewTouchpointForm={showNewTouchpointForm}
              onToggleTouchpointForm={() => setShowNewTouchpointForm(!showNewTouchpointForm)}
              newTouchpoint={newTouchpoint}
              onNewTouchpointChange={(tp) => setNewTouchpoint(tp)}
              onAddTouchpoint={() => {}}
            />
          </div>
        )}

        {/* Calendar Popup */}
        {showCalendarPopup && (
          <CalendarPopup
            isOpen={showCalendarPopup}
            onClose={() => setShowCalendarPopup(false)}
            onDateSelect={(date) => {
              setSelectedDate(date)
              setShowCalendarPopup(false)
            }}
            onMonthChange={handleCalendarMonthChange}
            touchpointCounts={touchpointCounts}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </DashboardLayout>
  )
} 