'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Calendar, ChevronLeft, ChevronRight, User } from 'lucide-react'
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
  users?: Array<{ id: string, email: string, first_name?: string, last_name?: string }>
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
  syncing,
  users = []
}: TouchpointsProps) {
  // Filter states
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('') // Add creator filter
  
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
    
    // Creator filter
    if (creatorFilter) {
      filtered = filtered.filter(tp => tp.created_by_id === creatorFilter)
    }
    
    setFilteredTouchpoints(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [touchpoints, typeFilter, dateFromFilter, dateToFilter, outcomeFilter, creatorFilter])
  
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
    setCreatorFilter('')
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
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="linkedin_message">LinkedIn</option>
          </select>

          {/* Date From Filter */}
          <div className="flex items-center">
            <span className="text-xs text-gray-500 mr-1">From:</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            />
          </div>

          {/* Date To Filter */}
          <div className="flex items-center">
            <span className="text-xs text-gray-500 mr-1">To:</span>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            />
          </div>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          
          {/* Creator Filter */}
          {users.length > 0 && (
            <select
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md flex items-center"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user.email}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* New Touchpoint Form */}
      {showNewTouchpointForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Touchpoint</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Type</label>
              <select
                value={newTouchpoint.type || ''}
                onChange={(e) => onNewTouchpointChange({ ...newTouchpoint, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Type</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="linkedin_message">LinkedIn Message</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={newTouchpoint.subject || ''}
                onChange={(e) => onNewTouchpointChange({ ...newTouchpoint, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Subject"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Content</label>
              <textarea
                value={newTouchpoint.content || ''}
                onChange={(e) => onNewTouchpointChange({ ...newTouchpoint, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Content"
                rows={3}
              ></textarea>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Outcome</label>
              <input
                type="text"
                value={newTouchpoint.outcome || ''}
                onChange={(e) => onNewTouchpointChange({ ...newTouchpoint, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Outcome (if completed)"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!!newTouchpoint.completed_at}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onNewTouchpointChange({
                        ...newTouchpoint,
                        completed_at: new Date().toISOString()
                      })
                    } else {
                      onNewTouchpointChange({
                        ...newTouchpoint,
                        completed_at: undefined
                      })
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Mark as Completed</span>
              </label>
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
                    {touchpoint.created_by && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <User className="h-3 w-3 mr-1" />
                        {touchpoint.created_by.first_name && touchpoint.created_by.last_name
                          ? `${touchpoint.created_by.first_name} ${touchpoint.created_by.last_name}`
                          : touchpoint.created_by.email}
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