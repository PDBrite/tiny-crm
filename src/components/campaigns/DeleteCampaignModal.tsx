'use client'

import { Trash2 } from 'lucide-react'

interface DeleteCampaignModalProps {
  campaignName: string
  deleting: boolean
  setShowDeleteModal: (show: boolean) => void
  handleDeleteCampaign: () => void
}

export default function DeleteCampaignModal({
  campaignName,
  deleting,
  setShowDeleteModal,
  handleDeleteCampaign
}: DeleteCampaignModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete Campaign</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>"{campaignName}"</strong>? 
            This will remove the campaign and unassign all leads from it.
          </p>
        </div>
        
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            disabled={deleting}
            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteCampaign}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 