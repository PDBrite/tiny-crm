'use client'

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, AlertCircle, CheckCircle, Pause, Flame, Clock } from 'lucide-react'

interface Account {
  email: string
  first_name?: string
  last_name?: string
  daily_limit: number
  status: number
  warmup_status?: number
  warmup_enabled?: boolean
  stat_warmup_score?: number
  timestamp_created: string
  timestamp_updated?: string
  timestamp_last_used?: string
}

export default function InboxesPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAccounts = async () => {
    try {
      setRefreshing(true)
      setError(null)

      const response = await fetch('/api/instantly-inboxes')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch accounts')
      }

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        )
      case 2:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Flame className="w-3 h-3 mr-1" />
            Warming Up
          </span>
        )
      case 0:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Pause className="w-3 h-3 mr-1" />
            Paused
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Status {status}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">Loading accounts...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Mail className="h-8 w-8 mr-3 text-purple-600" />
              Email Accounts
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your Instantly.ai email accounts and monitor sending capacity
            </p>
          </div>

          <button
            onClick={fetchAccounts}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-sm text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div
            className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Mail className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
            <p className="text-gray-600">
              No email accounts are configured in your Instantly.ai workspace yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Email Accounts ({accounts.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email / Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Limit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warmup Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warmup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr
                      key={account.email}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.email}
                            </div>
                            {(account.first_name || account.last_name) && (
                              <div className="text-sm text-gray-500">
                                {account.first_name} {account.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(account.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {account.daily_limit} emails/day
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.stat_warmup_score !== undefined && account.stat_warmup_score !== null ? (
                          <div className="flex items-center">
                            <div className="text-sm font-semibold text-purple-600">
                              {account.stat_warmup_score}%
                            </div>
                            <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-purple-600"
                                style={{ width: `${Math.min(account.stat_warmup_score, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.warmup_enabled ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Flame className="w-3 h-3 mr-1" />
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.timestamp_last_used ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(account.timestamp_last_used).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{accounts.length}</p>
              </div>
              <Mail className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Accounts</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {accounts.filter(a => a.status === 1).length}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Daily Capacity</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {accounts.reduce((sum, account) => sum + account.daily_limit, 0)}
                </p>
              </div>
              <Flame className="h-10 w-10 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
