'use client'

import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

interface CampaignHeaderProps {
  campaign: {
    name: string
    company: string
    status?: string
    description?: string
  }
  isEditing: boolean
  updating: boolean
  setIsEditing: (isEditing: boolean) => void
  handleUpdateCampaign: () => void
  setShowDeleteModal: (show: boolean) => void
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
}

export default function CampaignHeader({
  campaign,
  isEditing,
  updating,
  setIsEditing,
  handleUpdateCampaign,
  setShowDeleteModal,
  getStatusColor,
  getStatusIcon
}: CampaignHeaderProps) {
  const router = useRouter()

  return (
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
  )
} 