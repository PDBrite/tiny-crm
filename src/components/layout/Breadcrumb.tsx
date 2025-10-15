'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  name: string
  href: string
  current: boolean
}

export default function Breadcrumb() {
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
          console.error('Error fetching campaign name:', error)
        }
      } else {
        setCampaignName(null)
      }
    }
    
    fetchCampaignName()
  }, [pathname])
  
  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Handle root path or dashboard path
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      breadcrumbs.push({
        name: 'Dashboard',
        href: '/dashboard',
        current: true
      })
      return breadcrumbs
    }
    
    // Add home breadcrumb for other pages
    breadcrumbs.push({
      name: 'Dashboard',
      href: '/dashboard',
      current: false
    })
    
    // Build breadcrumbs from path segments
    let currentPath = ''
    segments.forEach((segment, index) => {
      if (segment === 'district-contacts') {
        currentPath += `/leads`
      } else {
        currentPath += `/${segment}`
      }
      
      // Convert segment to readable name
      let name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Handle special cases
      if (segment === 'outreach-sequences') {
        name = 'Outreach Sequences'
      } else if (segment === 'district-contacts') {
        name = 'District Contacts'
      } else if (segment === 'select-leads') {
        name = 'Select Leads'
      } else if (segment === 'select-districts') {
        name = 'Select Districts'
      } else if (segments[0] === 'campaigns' && index === 1 && 
                 segment !== 'select-leads' && segment !== 'select-districts') {
        // Use campaign name if available, otherwise show "Campaign Details"
        name = campaignName || 'Campaign Details'
      }
      
      breadcrumbs.push({
        name,
        href: currentPath,
        current: index === segments.length - 1
      })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={`${index}-${item.href}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}
            {item.current ? (
              <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center transition-colors"
              >
                {index === 0 && <Home className="h-4 w-4 mr-1" />}
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
} 