'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function PageTitle() {
  const pathname = usePathname()
  const [campaignName, setCampaignName] = useState<string | null>(null)
  
  // Fetch campaign name if we're on a campaign detail page
  useEffect(() => {
    const fetchCampaignName = async () => {
      const segments = pathname.split('/').filter(Boolean)
      
      // Check if we're on a campaign detail page (campaigns/[id])
      if (segments[0] === 'campaigns' && segments[1] && 
          segments[1] !== 'select-leads' && segments[1] !== 'select-districts') {
        try {
          const response = await fetch(`/api/campaign-data?id=${segments[1]}`)
          if (response.ok) {
            const data = await response.json()
            if (data.campaign?.name) {
              setCampaignName(data.campaign.name)
            }
          }
        } catch (error) {
          console.error('Error fetching campaign name for title:', error)
        }
      } else {
        setCampaignName(null)
      }
    }
    
    fetchCampaignName()
  }, [pathname])
  
  useEffect(() => {
    const generateTitle = () => {
      const segments = pathname.split('/').filter(Boolean)
      
      if (segments.length === 0) {
        return 'Dashboard - Tiny CRM'
      }
      
      // Convert path segments to readable titles
      const pageNames: Record<string, string> = {
        'campaigns': 'Campaigns',
        'leads': 'Leads',
        'districts': 'Districts',
        'outreach': 'Outreach',
        'outreach-sequences': 'Outreach Sequences',
        'users': 'Users',
        'import': 'Import',
        'select-leads': 'Select Leads',
        'select-districts': 'Select Districts',
        'district-contacts': 'District Contacts'
      }
      
      const pageName = pageNames[segments[0]] || segments[0]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Handle campaign detail pages
      if (segments[0] === 'campaigns' && segments[1] && segments[1] !== 'select-leads' && segments[1] !== 'select-districts') {
        return campaignName ? `${campaignName} - Tiny CRM` : 'Campaign Details - Tiny CRM'
      }
      
      return `${pageName} - Tiny CRM`
    }
    
    document.title = generateTitle()
  }, [pathname, campaignName])
  
  return null
} 