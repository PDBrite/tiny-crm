'use client'

import React from 'react'
import { Calendar, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'

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
  // Pagination props
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (itemsPerPage: number) => void
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
  // Pagination props
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages
}: CampaignTouchpointsTabProps) {
  
  // Function to get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCampaignTouchpoints.slice(startIndex, endIndex);
  };

  // Function to handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Filter Touchpoints</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={touchpointTypeFilter}
                onChange={(e) => setTouchpointTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Types</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="linkedin_message">LinkedIn Message</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={touchpointOutcomeFilter}
                onChange={(e) => setTouchpointOutcomeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={touchpointDateFromFilter}
                onChange={(e) => setTouchpointDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={touchpointDateToFilter}
                onChange={(e) => setTouchpointDateToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Touchpoint Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Touchpoints</p>
            <p className="text-2xl font-bold text-gray-900">{campaignTouchpoints.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Scheduled</p>
            <p className="text-2xl font-bold text-blue-600">
              {campaignTouchpoints.filter(tp => !tp.completed_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {campaignTouchpoints.filter(tp => tp.completed_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Upcoming (7 days)</p>
            <p className="text-2xl font-bold text-purple-600">
              {campaignTouchpoints.filter(tp => {
                if (!tp.scheduled_at || tp.completed_at) return false;
                const scheduled = new Date(tp.scheduled_at);
                const now = new Date();
                const sevenDaysLater = new Date();
                sevenDaysLater.setDate(now.getDate() + 7);
                return scheduled >= now && scheduled <= sevenDaysLater;
              }).length}
            </p>
          </div>
        </div>

        {/* Touchpoints List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Touchpoint Schedule</h3>
            <div className="flex items-center space-x-2">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing items per page
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
              <span className="text-sm text-gray-500">
                {filteredCampaignTouchpoints?.length || 0} touchpoints
              </span>
            </div>
          </div>
          <div className="p-6">
            {loadingTouchpoints ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading touchpoints...</span>
              </div>
            ) : campaignTouchpoints.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No touchpoints found</h3>
                <p className="text-gray-500 mb-4">
                  This campaign doesn't have any scheduled touchpoints yet.
                </p>
                <p className="text-sm text-gray-600">
                  Touchpoints are created automatically when you add leads or district contacts to a campaign with an outreach sequence.
                </p>
              </div>
            ) : filteredCampaignTouchpoints.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching touchpoints</h3>
                <p className="text-gray-500 mb-4">
                  No touchpoints match your current filters. Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getCurrentPageItems().map((touchpoint) => {
                  // Handle different data structures for CraftyCode vs Avalern
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
                        {touchpoint.outcome && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center">
                            <span className="font-medium mr-1">Outcome:</span> 
                            <span className={`${
                              touchpoint.outcome.toLowerCase().includes('positive') ? 'text-green-600' :
                              touchpoint.outcome.toLowerCase().includes('negative') ? 'text-red-600' :
                              'text-gray-600'
                            }`}>{touchpoint.outcome}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <div className={`w-3 h-3 rounded-full ${
                          isScheduled
                            ? isPast
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                            : 'bg-green-500'
                        }`}></div>
                      </div>
                    </div>
                  )
                })}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCampaignTouchpoints.length)}</span> to{' '}
                          <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCampaignTouchpoints.length)}</span> of{' '}
                          <span className="font-medium">{filteredCampaignTouchpoints.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">First</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                            <ChevronLeft className="h-5 w-5 -ml-2" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          {/* Page numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Show pages around the current page
                            let pageNum;
                            if (totalPages <= 5) {
                              // If 5 or fewer pages, show all
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              // If near the start
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              // If near the end
                              pageNum = totalPages - 4 + i;
                            } else {
                              // In the middle
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Last</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            <ChevronRight className="h-5 w-5 -ml-2" aria-hidden="true" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
