'use client'

import { Search } from 'lucide-react'
import { Campaign } from '../../types/leads'

interface LeadsFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  showFilters: boolean
  selectedStage: string
  onStageChange: (value: string) => void
  selectedCampaign: string
  onCampaignChange: (value: string) => void
  selectedSource: string
  onSourceChange: (value: string) => void
  selectedCity: string
  onCityChange: (value: string) => void
  availableStatuses: string[]
  campaigns: Campaign[]
  uniqueSources: string[]
  uniqueCities: string[]
  statusDisplayMap: Record<string, string>
  selectedCount: number
  totalCount: number
  onSelectNumber: (count: number) => void
}

export default function LeadsFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  selectedStage,
  onStageChange,
  selectedCampaign,
  onCampaignChange,
  selectedSource,
  onSourceChange,
  selectedCity,
  onCityChange,
  availableStatuses,
  campaigns,
  uniqueSources,
  uniqueCities,
  statusDisplayMap,
  selectedCount,
  totalCount,
  onSelectNumber
}: LeadsFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-3 ml-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectNumber(10)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Select 10
            </button>
            <button
              onClick={() => onSelectNumber(25)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Select 25
            </button>
            <button
              onClick={() => onSelectNumber(0)}
              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
            >
              Clear All
            </button>
          </div>
          {selectedCount > 0 && (
            <span className="text-sm text-gray-600 font-medium">
              {selectedCount} selected
            </span>
          )}
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {(availableStatuses || []).map(status => (
                <option key={status} value={status}>{statusDisplayMap[status] || status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
            <select
              value={selectedCampaign}
              onChange={(e) => onCampaignChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Campaigns</option>
              {(campaigns || []).map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              {(uniqueSources || []).map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Cities</option>
              {(uniqueCities || []).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
} 