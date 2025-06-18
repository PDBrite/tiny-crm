'use client'

import { Download, Upload } from 'lucide-react'

interface LeadsHeaderProps {
  onImportLeads: () => void
  onExportLeads: () => void
  selectedCount: number
  totalCompanyLeads: number
  selectedCompany: string
}

export default function LeadsHeader({
  onImportLeads,
  onExportLeads,
  selectedCount,
  totalCompanyLeads,
  selectedCompany
}: LeadsHeaderProps) {
  const isAvalern = selectedCompany === 'Avalern'
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isAvalern ? 'District Contacts' : 'Leads'} ({totalCompanyLeads})
        </h1>
        <p className="text-gray-600">
          {isAvalern 
            ? 'Manage district contacts for school outreach' 
            : `Manage and track your leads for ${selectedCompany}`
          }
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <button 
          onClick={onExportLeads}
          disabled={selectedCount === 0}
          className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 mr-2" />
          Export {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
        {!isAvalern && (
          <button
            onClick={onImportLeads}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Leads
          </button>
        )}
      </div>
    </div>
  )
} 