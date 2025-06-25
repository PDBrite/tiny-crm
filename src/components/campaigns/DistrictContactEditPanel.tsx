'use client'

import React from 'react'
import { X, Save, User, Mail, Phone, Building2, Briefcase } from 'lucide-react'

interface DistrictContactEditPanelProps {
  contact: any
  editingContactData: any
  setEditingContactData: (data: any) => void
  handleCloseContactEditPanel: () => void
  handleUpdateContact: () => void
  updating: boolean
}

export default function DistrictContactEditPanel({
  contact,
  editingContactData,
  setEditingContactData,
  handleCloseContactEditPanel,
  handleUpdateContact,
  updating
}: DistrictContactEditPanelProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Edit Contact</h3>
        <button
          onClick={handleCloseContactEditPanel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Contact Avatar */}
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-10 w-10 text-gray-500" />
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={editingContactData.first_name || ''}
                onChange={(e) => setEditingContactData({ ...editingContactData, first_name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={editingContactData.last_name || ''}
              onChange={(e) => setEditingContactData({ ...editingContactData, last_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={editingContactData.email || ''}
              onChange={(e) => setEditingContactData({ ...editingContactData, email: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={editingContactData.phone || ''}
              onChange={(e) => setEditingContactData({ ...editingContactData, phone: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={editingContactData.company || ''}
              disabled
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">District cannot be changed here</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={editingContactData.title || ''}
              onChange={(e) => setEditingContactData({ ...editingContactData, title: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={editingContactData.status || 'Valid'}
            onChange={(e) => setEditingContactData({ ...editingContactData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Valid">Valid</option>
            <option value="Invalid">Invalid</option>
            <option value="Unverified">Unverified</option>
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={handleUpdateContact}
            disabled={updating}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 