'use client'

interface CampaignTabsProps {
  activeTab: 'overview' | 'leads' | 'touchpoints'
  setActiveTab: (tab: 'overview' | 'leads' | 'touchpoints') => void
  campaignCompany: string
  leadsCount: number
  touchpointsCount: number
}

export default function CampaignTabs({
  activeTab,
  setActiveTab,
  campaignCompany,
  leadsCount,
  touchpointsCount
}: CampaignTabsProps) {
  return (
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
        {campaignCompany === 'Avalern' ? 'Contact Management' : 'Lead Management'} ({leadsCount})
      </button>
      <button
        onClick={() => setActiveTab('touchpoints')}
        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          activeTab === 'touchpoints'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Touchpoint Schedule ({touchpointsCount})
      </button>
    </div>
  )
} 