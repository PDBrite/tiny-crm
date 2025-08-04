'use client'

import { useState, useEffect } from 'react'
import { Calendar, BarChart3, Mail, Phone, MessageSquare } from 'lucide-react'

interface TouchpointAnalytics {
  total: number
  by_type: {
    email?: number
    call?: number
    linkedin_message?: number
  }
  touchpoints: Array<{
    id: string
    type: string
    scheduled_at?: string
    completed_at?: string
    outcome?: string
  }>
}

interface AnalyticsTabProps {
  selectedUser: string | null
}

export default function AnalyticsTab({ selectedUser }: AnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<TouchpointAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Set default date range to last 30 days
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setEndDate(today.toISOString().split('T')[0])
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  // Fetch analytics when user or date range changes
  useEffect(() => {
    if (!selectedUser || !startDate || !endDate) {
      setAnalytics(null)
      return
    }

    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/users/${selectedUser}/touchpoints?startDate=${startDate}&endDate=${endDate}`
        )
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedUser, startDate, endDate])

  const handleDateRangeChange = () => {
    // This will trigger the useEffect to refetch data
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'call':
        return <Phone className="h-4 w-4 text-green-500" />
      case 'linkedin_message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800'
      case 'call':
        return 'bg-green-100 text-green-800'
      case 'linkedin_message':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Analytics Date Range</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Touchpoints</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Emails</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.by_type.email || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Phone className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Calls</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.by_type.call || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">LinkedIn Messages</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.by_type.linkedin_message || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analytics */}
      {analytics && analytics.touchpoints.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Touchpoint Details</h3>
            <p className="text-sm text-gray-500 mt-1">
              {startDate} to {endDate}
            </p>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
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
                  {analytics.touchpoints.map((touchpoint) => (
                    <tr key={touchpoint.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(touchpoint.type)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {touchpoint.type.replace('_', ' ')}
                          </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {analytics && analytics.touchpoints.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No touchpoints found</h3>
            <p className="text-gray-500">
              No touchpoints were found for the selected date range ({startDate} to {endDate})
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 