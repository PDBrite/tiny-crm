'use client'

import { Calendar, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface CampaignTouchpointsTabProps {
  campaignTouchpoints: any[]
  filteredCampaignTouchpoints: any[]
  loadingTouchpoints: boolean
  touchpointTypeFilter: string
  setTouchpointTypeFilter: (filter: string) => void
  touchpointOutcomeFilter: string
  setTouchpointOutcomeFilter: (filter: string) => void
  touchpointDateFromFilter: string
  setTouchpointDateFromFilter: (filter: string) => void
  touchpointDateToFilter: string
  setTouchpointDateToFilter: (filter: string) => void
  touchpointCreatorFilter?: string
  setTouchpointCreatorFilter?: (filter: string) => void
  users?: Array<{ id: string, email: string, first_name?: string, last_name?: string }>
  // Pagination props
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (count: number) => void
  totalPages: number
}

export default function CampaignTouchpointsTab({
  campaignTouchpoints,
  filteredCampaignTouchpoints,
  loadingTouchpoints,
  touchpointTypeFilter,
  setTouchpointTypeFilter,
  touchpointOutcomeFilter,
  setTouchpointOutcomeFilter,
  touchpointDateFromFilter,
  setTouchpointDateFromFilter,
  touchpointDateToFilter,
  setTouchpointDateToFilter,
  touchpointCreatorFilter = '',
  setTouchpointCreatorFilter = () => {},
  users = [],
  // Pagination props
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages
}: CampaignTouchpointsTabProps) {
  
  // Function to get items for current page
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCampaignTouchpoints.slice(startIndex, endIndex);
  };
  
  // Add the creator filter to the filters section
  const renderFilters = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={touchpointTypeFilter}
              onChange={(e) => setTouchpointTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Types</option>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="linkedin_message">LinkedIn Message</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={touchpointOutcomeFilter}
              onChange={(e) => setTouchpointOutcomeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          
          {/* Date Range Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={touchpointDateFromFilter}
              onChange={(e) => setTouchpointDateFromFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={touchpointDateToFilter}
              onChange={(e) => setTouchpointDateToFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Creator Filter */}
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
              <select
                value={touchpointCreatorFilter}
                onChange={(e) => setTouchpointCreatorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            </div>
          )}
        </div>
        
        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setTouchpointTypeFilter('');
              setTouchpointOutcomeFilter('');
              setTouchpointDateFromFilter('');
              setTouchpointDateToFilter('');
              if (setTouchpointCreatorFilter) setTouchpointCreatorFilter('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderFilters()}
      
      {/* Touchpoints Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Touchpoints ({filteredCampaignTouchpoints.length} of {campaignTouchpoints.length})
          </h3>
        </div>

        <div className="p-6">
          {loadingTouchpoints ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading touchpoints...</span>
            </div>
          ) : filteredCampaignTouchpoints.length === 0 ? (
            campaignTouchpoints.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No touchpoints found</h3>
                <p className="text-gray-500 mb-4">
                  This campaign doesn't have any scheduled touchpoints yet.
                </p>
                <p className="text-sm text-gray-600">
                  Touchpoints are created automatically when you add leads or district contacts to a campaign with an outreach sequence.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching touchpoints</h3>
                <p className="text-gray-500 mb-4">
                  No touchpoints match your current filters. Try adjusting your search criteria.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {getCurrentPageItems().map((touchpoint) => {
                // Handle different data structures for different company lead/contact shapes
                const contact = touchpoint.lead || touchpoint.district_contact || touchpoint.contact
                const contactEmail = contact?.email
                const isScheduled = !touchpoint.completed_at
                const isPast = touchpoint.scheduled_at && new Date(touchpoint.scheduled_at) < new Date()
                
                return (
                  <div 
                    key={touchpoint.id} 
                    className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                      isScheduled 
                        ? isPast 
                          ? 'bg-amber-50 border border-amber-200' 
                          : 'bg-blue-50 border border-blue-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          touchpoint.type === 'email' ? 'bg-blue-100 text-blue-800' :
                          touchpoint.type === 'call' ? 'bg-green-100 text-green-800' :
                          touchpoint.type === 'linkedin_message' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {touchpoint.type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </span>
                        <span className="font-medium">
                          {contact?.first_name} {contact?.last_name}
                        </span>
                        {touchpoint.district_contact && touchpoint.district_contact.district_lead && (
                          <span className="text-xs text-gray-500">
                            ({touchpoint.district_contact.district_lead.district_name})
                          </span>
                        )}
                        
                        {/* Show creator if available */}
                        {touchpoint.created_by && (
                          <span className="text-xs text-gray-500">
                            Created by: {touchpoint.created_by.first_name && touchpoint.created_by.last_name
                              ? `${touchpoint.created_by.first_name} ${touchpoint.created_by.last_name}`
                              : touchpoint.created_by.email}
                          </span>
                        )}
                      </div>
                      {touchpoint.subject && (
                        <p className="text-sm font-medium text-gray-700 mt-1">{touchpoint.subject}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        {contactEmail && (
                          <p className="text-xs text-gray-500">{contactEmail}</p>
                        )}
                        {touchpoint.scheduled_at && (
                          <p className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Scheduled: {new Date(touchpoint.scheduled_at).toLocaleDateString()} {new Date(touchpoint.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        )}
                        {touchpoint.completed_at && (
                          <p className="text-xs text-gray-500 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            Completed: {new Date(touchpoint.completed_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {touchpoint.content && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {touchpoint.content.substring(0, 100)}{touchpoint.content.length > 100 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCampaignTouchpoints.length)} of {filteredCampaignTouchpoints.length}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
