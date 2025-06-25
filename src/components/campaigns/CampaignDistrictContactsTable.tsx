'use client'

import React from 'react'
import { Calendar, User, Minus } from 'lucide-react'

interface CampaignDistrictContactsTableProps {
  campaignLeads: any[]
  handleOpenContactEditPanel: (contact: any) => void
  handleRemoveLeadFromCampaign: (leadId: string) => void
  getTouchpointCounts: (leadId: string, isDistrictContact: boolean) => { scheduled: number; completed: number; total: number }
}

export default function CampaignDistrictContactsTable({
  campaignLeads,
  handleOpenContactEditPanel,
  handleRemoveLeadFromCampaign,
  getTouchpointCounts
}: CampaignDistrictContactsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          District Contacts ({campaignLeads.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                District/Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Touchpoints</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaignLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No contacts found for this campaign.
                </td>
              </tr>
            ) : (
              campaignLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenContactEditPanel(lead)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.first_name} {lead.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800`}>
                      {lead.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900 font-medium">
                          {lead.company}
                        </div>
                        <div className="text-sm text-gray-500">{lead.title}</div>
                      </div>
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {(() => {
                          const counts = getTouchpointCounts(lead.id, lead.is_district_contact)
                          return (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {counts.scheduled} scheduled
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {counts.completed} completed
                              </span>
                            </>
                          )
                        })()}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRemoveLeadFromCampaign(lead.id)}
                      className="flex items-center text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
