'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, User, MapPin, Building, Phone, Mail, Calendar, FileText, MessageSquare, ExternalLink, Edit, Trash2, Save, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CalendarPopup from '@/components/CalendarPopup'

interface Touchpoint {
  id: string
  type: string
  subject?: string
  content?: string
  scheduled_at?: string
  completed_at?: string
  outcome?: string
  outcome_enum?: string
  created_at: string
  created_by?: {
    id: string
    email: string
    name: string
  }
}

interface DistrictContactDetail {
  id: string
  first_name: string
  last_name: string
  title: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
  state: string | null
  created_at: string
  last_contacted_at?: string
  district_lead_id: string
  campaign_id?: string
  district_lead?: {
    id: string
    district_name: string
    county: string
    state: string
    type?: string
    size?: number
    budget?: number
    website?: string
    notes?: string
  }
  campaign?: {
    id: string
    name: string
    company: string
    description?: string
    status: string
  }
  touchpoints: Touchpoint[]
  touchpoints_count: number
  completed_touchpoints_count: number
  scheduled_touchpoints_count: number
}

export default function DistrictContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string
  
  // State
  const [contact, setContact] = useState<DistrictContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState<Partial<DistrictContactDetail>>({})
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [newTouchpoint, setNewTouchpoint] = useState({
    type: 'email',
    subject: '',
    content: '',
    scheduled_at: ''
  })
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)

  // Fetch contact data - simplified approach
  useEffect(() => {
    console.log('useEffect triggered with contactId:', contactId)
    
    if (!contactId) {
      console.log('No contactId provided, setting error')
      setError('No contact ID provided')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    
    const fetchContact = async () => {
      console.log('Starting fetch for contactId:', contactId)
      try {
        setLoading(true)
        setError(null)
        
        const url = `/api/district-contacts/${contactId}`
        console.log('Fetching from URL:', url)
        
        const response = await fetch(url, {
          signal: controller.signal
        })
        
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Error fetching contact: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('Received data:', data)
        setContact(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Request was aborted')
          return // Request was aborted
        }
        console.error('Error fetching district contact:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch contact')
      } finally {
        setLoading(false)
      }
    }

    fetchContact()
    
    return () => {
      console.log('Cleaning up useEffect for contactId:', contactId)
      controller.abort()
    }
  }, [contactId])

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_contacted':
        return 'bg-gray-100 text-gray-800'
      case 'actively_contacting':
        return 'bg-blue-100 text-blue-800'
      case 'engaged':
        return 'bg-green-100 text-green-800'
      case 'won':
        return 'bg-emerald-100 text-emerald-800'
      case 'not_interested':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTouchpointTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'linkedin_message':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  // Edit handlers
  const handleEdit = () => {
    if (!contact) return
    setEditingData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      notes: contact.notes
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingData({})
  }

  const handleSave = async () => {
    if (!contact) return

    setSaving(true)
    try {
      const response = await fetch(`/api/district-contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingData),
      })

      if (!response.ok) {
        throw new Error('Failed to update contact')
      }

      const updatedContact = await response.json()
      setContact(updatedContact)
      setIsEditing(false)
      setEditingData({})
    } catch (error) {
      console.error('Error updating contact:', error)
      alert('Failed to update contact')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!contact) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/district-contacts/${contact.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }

      alert('Contact deleted successfully!')
      router.push('/leads')
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Failed to delete contact')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleScheduleTouchpoint = async () => {
    if (!contact) return

    setScheduling(true)
    try {
      const response = await fetch('/api/touchpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          district_contact_id: contact.id,
          type: newTouchpoint.type,
          subject: newTouchpoint.subject,
          content: newTouchpoint.content,
          scheduled_at: newTouchpoint.scheduled_at
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule touchpoint')
      }

      const data = await response.json()
      
      // Refresh contact data to show new touchpoint
      const refreshResponse = await fetch(`/api/district-contacts/${contactId}`)
      if (refreshResponse.ok) {
        const refreshedContact = await refreshResponse.json()
        setContact(refreshedContact)
      }

      alert('Touchpoint scheduled successfully!')
      setShowScheduleModal(false)
      setNewTouchpoint({
        type: 'email',
        subject: '',
        content: '',
        scheduled_at: ''
      })
    } catch (error) {
      console.error('Error scheduling touchpoint:', error)
      alert('Failed to schedule touchpoint')
    } finally {
      setScheduling(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error || !contact) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested contact could not be found.'}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <button
              onClick={() => router.push('/leads')}
              className="hover:text-gray-700 transition-colors"
            >
              District Contacts
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {contact.first_name} {contact.last_name}
            </span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contact.first_name} {contact.last_name}
              </h1>
              <p className="text-lg text-gray-600 mt-1">{contact.title}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                {contact.status.replace('_', ' ').toUpperCase()}
              </span>
              
              {!isEditing ? (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Touchpoint
                  </button>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editingData.email || ''}
                          onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{contact.email || 'No email provided'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editingData.phone || ''}
                          onChange={(e) => setEditingData({ ...editingData, phone: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{contact.phone || 'No phone provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Contacted</p>
                      <p className="text-sm text-gray-900">
                        {contact.last_contacted_at ? formatDate(contact.last_contacted_at) : 'Never contacted'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Added</p>
                      <p className="text-sm text-gray-900">{formatDate(contact.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editingData.first_name || ''}
                      onChange={(e) => setEditingData({ ...editingData, first_name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editingData.last_name || ''}
                      onChange={(e) => setEditingData({ ...editingData, last_name: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editingData.title || ''}
                      onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editingData.status || ''}
                      onChange={(e) => setEditingData({ ...editingData, status: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="not_contacted">Not Contacted</option>
                      <option value="actively_contacting">Actively Contacting</option>
                      <option value="engaged">Engaged</option>
                      <option value="won">Won</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* District Information */}
            {contact.district_lead && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">District Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">District</p>
                        <p className="text-sm text-gray-900">{contact.district_lead.district_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">County</p>
                        <p className="text-sm text-gray-900">{contact.district_lead.county}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {contact.district_lead.website && (
                      <div className="flex items-center">
                        <ExternalLink className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Website</p>
                          <a 
                            href={contact.district_lead.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}
                    {contact.district_lead.budget && (
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Budget</p>
                          <p className="text-sm text-gray-900">
                            ${contact.district_lead.budget.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {contact.district_lead.notes && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-500 mb-2">District Notes</p>
                    <p className="text-sm text-gray-900">{contact.district_lead.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Information */}
            {contact.campaign && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Information</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Campaign Name</p>
                    <p className="text-sm text-gray-900">{contact.campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Company</p>
                    <p className="text-sm text-gray-900">{contact.campaign.company}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.campaign.status)}`}>
                      {contact.campaign.status.toUpperCase()}
                    </span>
                  </div>
                  {contact.campaign.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Description</p>
                      <p className="text-sm text-gray-900">{contact.campaign.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Touchpoints */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Touchpoints</h2>
                <div className="flex space-x-4 text-sm text-gray-500">
                  <span>Total: {contact.touchpoints_count}</span>
                  <span>Completed: {contact.completed_touchpoints_count}</span>
                  <span>Scheduled: {contact.scheduled_touchpoints_count}</span>
                </div>
              </div>
              
              {contact.touchpoints.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No touchpoints recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {contact.touchpoints.map((touchpoint) => (
                    <div key={touchpoint.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {getTouchpointTypeIcon(touchpoint.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {touchpoint.type.replace('_', ' ').toUpperCase()}
                            </p>
                            {touchpoint.subject && (
                              <p className="text-sm text-gray-600">{touchpoint.subject}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDateTime(touchpoint.created_at)}
                          </p>
                          {touchpoint.completed_at && (
                            <p className="text-xs text-green-600">Completed</p>
                          )}
                        </div>
                      </div>
                      
                      {touchpoint.content && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700">{touchpoint.content}</p>
                        </div>
                      )}
                      
                      {touchpoint.outcome && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500">Outcome:</p>
                          <p className="text-sm text-gray-900">{touchpoint.outcome}</p>
                        </div>
                      )}
                      
                      {touchpoint.created_by && (
                        <div className="mt-3 flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-xs text-gray-500">
                            Created by {touchpoint.created_by.name}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="flex items-start">
                <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                {isEditing ? (
                  <textarea
                    value={editingData.notes || ''}
                    onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
                    rows={4}
                    className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes about this contact..."
                  />
                ) : (
                  <p className="text-sm text-gray-700">{contact.notes || 'No notes added yet.'}</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Touchpoints</span>
                  <span className="text-sm font-medium text-gray-900">{contact.touchpoints_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-sm font-medium text-green-600">{contact.completed_touchpoints_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Scheduled</span>
                  <span className="text-sm font-medium text-blue-600">{contact.scheduled_touchpoints_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Days Since Added</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Contact</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <strong>"{contact?.first_name} {contact?.last_name}"</strong>? 
                This will permanently remove the contact and all associated touchpoints.
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
                onClick={handleDelete}
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
                    Delete Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Touchpoint Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Schedule Touchpoint</h3>
                <p className="text-sm text-gray-500">Schedule a new touchpoint for {contact?.first_name} {contact?.last_name}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newTouchpoint.type}
                  onChange={(e) => setNewTouchpoint({ ...newTouchpoint, type: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="linkedin_message">LinkedIn Message</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTouchpoint.subject}
                  onChange={(e) => setNewTouchpoint({ ...newTouchpoint, subject: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Subject line or call topic"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newTouchpoint.content}
                  onChange={(e) => setNewTouchpoint({ ...newTouchpoint, content: e.target.value })}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email content or call notes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newTouchpoint.scheduled_at ? newTouchpoint.scheduled_at.split('T')[0] : ''}
                    onClick={() => setShowCalendarPopup(true)}
                    readOnly
                    placeholder="Click to select date"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduling}
                className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleTouchpoint}
                disabled={scheduling}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {scheduling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Touchpoint
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={showCalendarPopup}
        onClose={() => setShowCalendarPopup(false)}
        selectedDate={newTouchpoint.scheduled_at ? newTouchpoint.scheduled_at.split('T')[0] : ''}
        onDateSelect={(date) => {
          // Set the time to 9:00 AM by default
          const scheduledAt = `${date}T09:00`;
          setNewTouchpoint({ ...newTouchpoint, scheduled_at: scheduledAt });
          setShowCalendarPopup(false);
        }}
        touchpointCounts={{}}
      />
    </DashboardLayout>
  )
} 