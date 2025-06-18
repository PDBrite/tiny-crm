'use client'

import { RefreshCw, X } from 'lucide-react'

interface SyncResultsProps {
  syncResults: {
    syncedCount: number
    totalEmails: number
    errors?: string[]
  } | null
  onDismiss: () => void
}

export default function SyncResults({ syncResults, onDismiss }: SyncResultsProps) {
  if (!syncResults) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <RefreshCw className="h-5 w-5 text-green-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">
            Instantly Sync Completed
          </h3>
          <div className="mt-2 text-sm text-green-700">
            <p>
              Successfully synced {syncResults.syncedCount} new contact attempts from {syncResults.totalEmails} emails.
            </p>
            {syncResults.errors && syncResults.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Errors encountered:</p>
                <ul className="list-disc list-inside">
                  {syncResults.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 