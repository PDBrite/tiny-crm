'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Lead, Campaign, Touchpoint, STATUS_DISPLAY_MAP } from '../../types/leads'

interface LeadDetailPanelProps {
  selectedLead: Lead
  editingLead: Lead
  onEditingLeadChange: (lead: Lead) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
  campaigns: Campaign[]
  availableStatuses: string[]
  touchpoints: Touchpoint[]
  showNewTouchpointForm: boolean
  onToggleTouchpointForm: () => void
  newTouchpoint: Partial<Touchpoint>
  onNewTouchpointChange: (touchpoint: Partial<Touchpoint>) => void
  onAddTouchpoint: () => void
}

export default function LeadDetailPanel({
  selectedLead,
  editingLead,
  onEditingLeadChange,
  onClose,
  onSave,
  saving,
  campaigns,
  availableStatuses,
  touchpoints,
  showNewTouchpointForm,
  onToggleTouchpointForm,
  newTouchpoint,
  onNewTouchpointChange,
  onAddTouchpoint
}: LeadDetailPanelProps) {
  const [touchpointTab, setTouchpointTab] = useState<'past' | 'scheduled'>('past')
  
  // Filter touchpoints based on tab selection
  const pastTouchpoints = touchpoints.filter(tp => tp.completed_at)
  const scheduledTouchpoints = touchpoints.filter(tp => tp.scheduled_at && !tp.completed_at)
  const currentTouchpoints = touchpointTab === 'past' ? pastTouchpoints : scheduledTouchpoints

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
          {editingLead.first_name} {editingLead.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
          <X className="h-5 w-5" />
          </button>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={editingLead.first_name}
                onChange={(e) => onEditingLeadChange({...editingLead, first_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={editingLead.last_name}
                onChange={(e) => onEditingLeadChange({...editingLead, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editingLead.email}
                onChange={(e) => onEditingLeadChange({...editingLead, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editingLead.phone || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {(editingLead as any).title && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={(editingLead as any).title || ''}
                  onChange={(e) => onEditingLeadChange({...editingLead, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Status & Campaign */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Status & Campaign</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingLead.status}
                onChange={(e) => onEditingLeadChange({...editingLead, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {STATUS_DISPLAY_MAP[status] || status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
              <select
                value={editingLead.campaign_id || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, campaign_id: e.target.value || undefined})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Campaign</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location & Company */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Location & Company</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editingLead.city || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={editingLead.state || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={editingLead.company || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, company: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Source */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Source</h3>
              <select
                value={editingLead.source || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, source: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            <option value="">Select Source</option>
                <option value="Zillow">Zillow</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Realtor.com">Realtor.com</option>
                <option value="Redfin">Redfin</option>
                <option value="Trulia">Trulia</option>
                <option value="Other">Other</option>
              </select>
        </div>

        {/* URLs */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">URLs & Links</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={editingLead.linkedin_url || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, linkedin_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={editingLead.website_url || ''}
                onChange={(e) => onEditingLeadChange({...editingLead, website_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Notes</h3>
          <textarea
            value={editingLead.notes || ''}
            onChange={(e) => onEditingLeadChange({...editingLead, notes: e.target.value})}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add notes about this lead..."
          />
        </div>

        {/* Touchpoints */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-gray-900">Touchpoints</h3>
            <button
              onClick={onToggleTouchpointForm}
              className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Touchpoint
            </button>
          </div>

          {/* Touchpoint Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setTouchpointTab('past')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  touchpointTab === 'past'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Past ({pastTouchpoints.length})
              </button>
              <button
                onClick={() => setTouchpointTab('scheduled')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  touchpointTab === 'scheduled'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scheduled ({scheduledTouchpoints.length})
              </button>
            </nav>
          </div>

          {/* New Touchpoint Form */}
          {showNewTouchpointForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">New Touchpoint</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newTouchpoint.type || 'email'}
                    onChange={(e) => onNewTouchpointChange({...newTouchpoint, type: e.target.value as Touchpoint['type']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="call">Phone Call</option>
                    <option value="linkedin_message">LinkedIn Message</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTouchpoint.completed_at ? newTouchpoint.completed_at.split('T')[0] : ''}
                    onChange={(e) => onNewTouchpointChange({...newTouchpoint, completed_at: e.target.value ? e.target.value + 'T09:00:00' : ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={newTouchpoint.subject || ''}
                    onChange={(e) => onNewTouchpointChange({...newTouchpoint, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief subject or title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newTouchpoint.content || ''}
                    onChange={(e) => onNewTouchpointChange({...newTouchpoint, content: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Details about this touchpoint..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
                  <input
                    type="text"
                    value={newTouchpoint.outcome || ''}
                    onChange={(e) => onNewTouchpointChange({...newTouchpoint, outcome: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Result or outcome"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={onToggleTouchpointForm}
                    className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onAddTouchpoint}
                    disabled={saving}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Adding...' : 'Add Touchpoint'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Touchpoints List */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {currentTouchpoints.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No {touchpointTab} touchpoints yet
              </p>
            ) : (
              currentTouchpoints.map((touchpoint) => (
                <div key={touchpoint.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        touchpoint.type === 'email' ? 'bg-blue-100 text-blue-800' :
                        touchpoint.type === 'call' ? 'bg-green-100 text-green-800' :
                        touchpoint.type === 'linkedin_message' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {touchpoint.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {touchpoint.subject && (
                        <span className="text-sm font-medium text-gray-900">{touchpoint.subject}</span>
                      )}
                      {touchpoint.outcome && touchpointTab === 'past' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          COMPLETED
                        </span>
                      )}
                      {touchpointTab === 'scheduled' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          SCHEDULED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {touchpointTab === 'past' 
                        ? (touchpoint.completed_at ? new Date(touchpoint.completed_at).toLocaleDateString() : 'No date')
                        : (touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : 'No date')
                      }
                    </span>
                  </div>
                  {touchpoint.content && (
                    <p className="text-sm text-gray-700 mb-2">{touchpoint.content}</p>
                  )}
                  {touchpoint.outcome && touchpointTab === 'past' && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Outcome:</span> {touchpoint.outcome}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lead Information Summary */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">Lead Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {STATUS_DISPLAY_MAP[selectedLead.status] || selectedLead.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <span className="ml-2 text-gray-900">{new Date(selectedLead.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Contact:</span>
                <span className="ml-2 text-gray-900">
                  {selectedLead.last_contacted_at ? new Date(selectedLead.last_contacted_at).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Total Touchpoints:</span>
                <span className="ml-2 text-gray-900">{touchpoints.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Past Touchpoints:</span>
                <span className="ml-2 text-gray-900">{pastTouchpoints.length}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Scheduled Touchpoints:</span>
                <span className="ml-2 text-gray-900">{scheduledTouchpoints.length}</span>
            </div>
          </div>
        </div>
      </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
            Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        </div>
      </div>
    </div>
  )
} 