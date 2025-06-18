'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Touchpoint } from '../../types/leads'

interface TouchpointsProps {
  touchpoints: Touchpoint[]
  showNewTouchpointForm: boolean
  onToggleForm: () => void
  newTouchpoint: Partial<Touchpoint>
  onNewTouchpointChange: (touchpoint: Partial<Touchpoint>) => void
  onAddTouchpoint: () => void
  saving: boolean
  onSyncInstantly: () => void
  syncing: boolean
}

export default function Touchpoints({
  touchpoints,
  showNewTouchpointForm,
  onToggleForm,
  newTouchpoint,
  onNewTouchpointChange,
  onAddTouchpoint,
  saving,
  onSyncInstantly,
  syncing
}: TouchpointsProps) {
  // Filter states
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Filtered and paginated data
  const [filteredTouchpoints, setFilteredTouchpoints] = useState<Touchpoint[]>(touchpoints)
  const [paginatedTouchpoints, setPaginatedTouchpoints] = useState<Touchpoint[]>([])
  
  // Apply filters whenever touchpoints or filters change
  useEffect(() => {
    let filtered = [...touchpoints]
    
    // Type filter
    if (typeFilter) {
      filtered = filtered.filter(tp => tp.type === typeFilter)
    }
    
    // Date range filter
    if (dateFromFilter) {
      filtered = filtered.filter(tp => {
        const tpDate = tp.completed_at || tp.scheduled_at
        return tpDate && new Date(tpDate) >= new Date(dateFromFilter)
      })
    }
    
    if (dateToFilter) {
      filtered = filtered.filter(tp => {
        const tpDate = tp.completed_at || tp.scheduled_at
        return tpDate && new Date(tpDate) <= new Date(dateToFilter + 'T23:59:59')
      })
    }
    
    // Outcome filter
    if (outcomeFilter) {
      if (outcomeFilter === 'completed') {
        filtered = filtered.filter(tp => tp.outcome)
      } else if (outcomeFilter === 'pending') {
        filtered = filtered.filter(tp => !tp.outcome)
      }
    }
    
    setFilteredTouchpoints(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [touchpoints, typeFilter, dateFromFilter, dateToFilter, outcomeFilter])
  
  // Apply pagination whenever filtered data or page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setPaginatedTouchpoints(filteredTouchpoints.slice(startIndex, endIndex))
  }, [filteredTouchpoints, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(filteredTouchpoints.length / itemsPerPage)
  
  const clearFilters = () => {
    setTypeFilter('')
    setDateFromFilter('')
    setDateToFilter('')
    setOutcomeFilter('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-medium text-gray-900">
          Touchpoints ({filteredTouchpoints.length} of {touchpoints.length})
        </h3>
        <div className="flex items-center space-x-2">
          {/* <button
            onClick={onSyncInstantly}
            disabled={syncing}
            className="flex items-center px-3 py-1 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Instantly'}
          </button> */}
          <button
            onClick={onToggleForm}
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Touchpoint
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Filters</h4>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="linkedin_message">LinkedIn Message</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
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
                onClick={onToggleForm}
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
      <div className="space-y-3">
        {filteredTouchpoints.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {touchpoints.length === 0 ? 'No touchpoints yet' : 'No touchpoints match the current filters'}
          </p>
        ) : (
          <>
            {paginatedTouchpoints.map((touchpoint) => (
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
                    {touchpoint.outcome && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {touchpoint.completed_at ? new Date(touchpoint.completed_at).toLocaleDateString() : 
                     touchpoint.scheduled_at ? new Date(touchpoint.scheduled_at).toLocaleDateString() : 'No date'}
                  </span>
                </div>
                {touchpoint.content && (
                  <p className="text-sm text-gray-700 mb-2">{touchpoint.content}</p>
                )}
                {touchpoint.outcome && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Outcome:</span> {touchpoint.outcome}
                  </p>
                )}
              </div>
            ))}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTouchpoints.length)} of {filteredTouchpoints.length} touchpoints
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 