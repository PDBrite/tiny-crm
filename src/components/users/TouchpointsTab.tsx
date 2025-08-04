'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, Calendar } from 'lucide-react'

interface UserTouchpoint {
  id: string
  type: 'email' | 'call' | 'linkedin_message'
  subject?: string
  content?: string
  scheduled_at?: string
  completed_at?: string
  outcome?: string
  created_at: string
  lead?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  district_contact?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

interface TouchpointsTabProps {
  selectedUser: string | null
}

export default function TouchpointsTab({ selectedUser }: TouchpointsTabProps) {
  const [userTouchpoints, setUserTouchpoints] = useState<UserTouchpoint[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch user touchpoints when a user is selected
  useEffect(() => {
    if (!selectedUser) {
      setUserTouchpoints([])
      return
    }

    const fetchUserTouchpoints = async () => {
      setLoading(true)
      try {
        const touchpointsResponse = await fetch(`/api/users/${selectedUser}/touchpoints`)
        if (touchpointsResponse.ok) {
          const data = await touchpointsResponse.json()
          setUserTouchpoints(data.touchpoints || [])
        }
      } catch (error) {
        console.error('Error fetching user touchpoints:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserTouchpoints()
  }, [selectedUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Touchpoints</h2>
          <p className="text-sm text-gray-500 mt-1">
            All touchpoints for the selected user
          </p>
        </div>
        <div className="p-4">
          {userTouchpoints.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p>No touchpoints found for this user</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userTouchpoints.map((touchpoint) => {
                    const contact = touchpoint.lead || touchpoint.district_contact
                    return (
                      <tr key={touchpoint.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {touchpoint.type === 'email' ? (
                              <Mail className="h-4 w-4 text-blue-500 mr-2" />
                            ) : touchpoint.type === 'call' ? (
                              <Phone className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <Mail className="h-4 w-4 text-purple-500 mr-2" />
                            )}
                            <span className="text-sm text-gray-900 capitalize">
                              {touchpoint.type.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{contact?.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate max-w-xs">
                            {touchpoint.subject || 'No subject'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {touchpoint.scheduled_at
                              ? new Date(touchpoint.scheduled_at).toLocaleDateString()
                              : 'Not scheduled'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {touchpoint.completed_at
                              ? new Date(touchpoint.completed_at).toLocaleDateString()
                              : 'Not completed'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {touchpoint.completed_at ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {touchpoint.outcome || 'N/A'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 