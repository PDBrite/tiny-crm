'use client'

import { User, Calendar, MapPin, Building } from 'lucide-react'
import { Lead } from '../../types/leads'
import { DistrictContact, DISTRICT_STATUS_DISPLAY_MAP } from '../../types/districts'
import { STATUS_DISPLAY_MAP } from '../../types/leads'

interface LeadsTableProps {
  leads?: Lead[]
  districtContacts?: DistrictContact[]
  selectedLeads: string[]
  selectedLead: Lead | null
  isAvalern: boolean
  onSelectLead: (leadId: string) => void
  onSelectAll: () => void
  onLeadClick: (lead: Lead) => void
  onDistrictContactClick?: (contact: DistrictContact) => void
}

export default function LeadsTable({
  leads = [],
  districtContacts = [],
  selectedLeads,
  selectedLead,
  isAvalern,
  onSelectLead,
  onSelectAll,
  onLeadClick,
  onDistrictContactClick
}: LeadsTableProps) {
  const currentData = isAvalern ? districtContacts : leads
  const dataLength = currentData.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isAvalern ? `District Contacts (${dataLength})` : `Leads (${dataLength})`}
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLeads.length === dataLength && dataLength > 0}
              onChange={onSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Select
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isAvalern ? 'Contact' : 'Lead'}
              </th>
              {!selectedLead && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isAvalern ? 'District' : 'Campaign'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Touchpoints
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataLength === 0 ? (
              <tr>
                <td colSpan={selectedLead ? 2 : 7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <User className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {isAvalern ? 'No district contacts found' : 'No leads found'}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {isAvalern 
                        ? 'Get started by importing district data or creating a new campaign.'
                        : 'Get started by importing leads or creating a new campaign.'
                      }
                    </p>
                    <button
                      onClick={() => window.location.href = '/import'}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isAvalern ? 'Import Districts' : 'Import Leads'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : isAvalern ? (
              // Render district contacts
              districtContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onDistrictContactClick?.(contact)}>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(contact.id)}
                      onChange={() => onSelectLead(contact.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center mr-3">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                        <div className="text-xs text-gray-400">{contact.title}</div>
                      </div>
                    </div>
                  </td>
                  {!selectedLead && (
                    <>
                      <td className="px-6 py-4">
                                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contact.district_lead?.status === 'not_contacted' ? 'bg-gray-100 text-gray-800' :
                        contact.district_lead?.status === 'actively_contacting' ? 'bg-blue-100 text-blue-800' :
                        contact.district_lead?.status === 'engaged' ? 'bg-green-100 text-green-800' :
                        contact.district_lead?.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                        contact.district_lead?.status === 'not_interested' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                          {DISTRICT_STATUS_DISPLAY_MAP[contact.district_lead?.status as keyof typeof DISTRICT_STATUS_DISPLAY_MAP] || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {contact.district_lead?.district_name || 'Unknown District'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {contact.district_lead?.county || 'Unknown County'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {contact.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {(contact.touchpoints_count ?? 0)} total
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {(contact.scheduled_touchpoints_count ?? 0)} scheduled
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          Never {/* TODO: Add last_contacted_at to district_contacts */}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              // Render individual leads
              leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onLeadClick(lead)}>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={() => onSelectLead(lead.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
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
                {!selectedLead && (
                  <>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.status === 'not_contacted' ? 'bg-gray-100 text-gray-800' :
                          lead.status === 'actively_contacting' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'engaged' ? 'bg-green-100 text-green-800' :
                          lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                          lead.status === 'not_interested' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_DISPLAY_MAP[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {lead.campaign?.name || 'No Campaign'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.city || lead.state || 'N/A'}
                      </div>
                      <div className="text-sm">
                        {lead.online_profile ? (
                          <a 
                            href={lead.online_profile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Profile
                          </a>
                        ) : lead.linkedin_url ? (
                          <a 
                            href={lead.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            LinkedIn
                          </a>
                        ) : (
                          <span className="text-gray-500">{lead.source || 'Unknown'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(lead.touchpoints_count ?? 0)} total
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {(lead.scheduled_touchpoints_count ?? 0)} scheduled
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                  </>
                )}
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 