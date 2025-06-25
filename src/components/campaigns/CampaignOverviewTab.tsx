'use client'

import React from 'react'

interface CampaignOverviewTabProps {
  campaign: {
    name: string
    company: string
    start_date?: string
    end_date?: string
    created_at: string
    status?: string
    description?: string
    outreach_sequence?: {
      id: string
      name: string
      description?: string
    }
    instantly_campaign_id?: string
  }
  isEditing: boolean
  editFormData: {
    name: string
    company: string
    description: string
    start_date: string
    end_date: string
    instantly_campaign_id: string
    status: string
  }
  setEditFormData: (data: any) => void
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  sequenceSteps: Array<{
    id: string
    step_order: number
    type: string
    name?: string
    day_offset: number
    days_after_previous?: number
  }>
  loadingSequenceSteps: boolean
}

export default function CampaignOverviewTab({
  campaign,
  isEditing,
  editFormData,
  setEditFormData,
  getStatusColor,
  getStatusIcon,
  sequenceSteps,
  loadingSequenceSteps
}: CampaignOverviewTabProps) {
  return (
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
  )
} 