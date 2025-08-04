'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, X, UserPlus, Search, Check, AlertCircle } from 'lucide-react'
import { UserRoleType } from '@prisma/client'

interface UserDistrictContact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  title?: string
  districtName: string
  status: string
  campaignId?: string
  campaignName?: string
}

interface CurrentAssignedLeadsTabProps {
  selectedUser: string | null
  currentUserRole: UserRoleType | null
}

export default function CurrentAssignedLeadsTab({ selectedUser, currentUserRole }: CurrentAssignedLeadsTabProps) {
  const [userDistrictContacts, setUserDistrictContacts] = useState<UserDistrictContact[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedContact, setSelectedContact] = useState<UserDistrictContact | null>(null)
  const [showContactDetails, setShowContactDetails] = useState(false)
  
  // District assignment states
  const [showAssignDistrictsModal, setShowAssignDistrictsModal] = useState(false)
  const [availableDistricts, setAvailableDistricts] = useState<any[]>([])
  const [selectedDistrictsToAssign, setSelectedDistrictsToAssign] = useState<string[]>([])
  const [assigningDistricts, setAssigningDistricts] = useState(false)
  const [districtSearchTerm, setDistrictSearchTerm] = useState('')

  // Fetch user details when a user is selected
  useEffect(() => {
    if (!selectedUser) {
      setUserDistrictContacts([])
      return
    }

    const fetchUserDetails = async () => {
      setLoading(true)
      try {
        // Fetch user district contacts
        const leadsResponse = await fetch(`/api/users/${selectedUser}/leads`)
        if (leadsResponse.ok) {
          const data = await leadsResponse.json()
          setUserDistrictContacts(data.districtContacts || [])
        }
      } catch (error) {
        console.error('Error fetching user details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [selectedUser])



  // District assignment functions
  const fetchAvailableDistricts = async () => {
    try {
      const response = await fetch('/api/districts?limit=100')
      if (response.ok) {
        const data = await response.json()
        setAvailableDistricts(data.districts || [])
      }
    } catch (error) {
      console.error('Error fetching available districts:', error)
    }
  }

  const handleOpenAssignDistrictsModal = () => {
    fetchAvailableDistricts()
    setShowAssignDistrictsModal(true)
  }

  const handleCloseAssignDistrictsModal = () => {
    setShowAssignDistrictsModal(false)
    setSelectedDistrictsToAssign([])
    setDistrictSearchTerm('')
  }

  const handleToggleDistrictSelection = (districtId: string) => {
    setSelectedDistrictsToAssign(prev => 
      prev.includes(districtId) 
        ? prev.filter(id => id !== districtId) 
        : [...prev, districtId]
    )
  }

  const handleAssignDistricts = async () => {
    if (!selectedUser || selectedDistrictsToAssign.length === 0) return
    
    setAssigningDistricts(true)
    try {
      const response = await fetch(`/api/users/${selectedUser}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          districtIds: selectedDistrictsToAssign,
          action: 'assign'
        })
      })
      
      if (response.ok) {
        // Refresh user details
        const leadsResponse = await fetch(`/api/users/${selectedUser}/leads`)
        if (leadsResponse.ok) {
          const data = await leadsResponse.json()
          setUserDistrictContacts(data.districtContacts || [])
        }
        handleCloseAssignDistrictsModal()
      } else {
        console.error('Failed to assign districts')
      }
    } catch (error) {
      console.error('Error assigning districts:', error)
    } finally {
      setAssigningDistricts(false)
    }
  }

  const handleUnassignDistrict = async (districtId: string) => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/users/${selectedUser}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          districtIds: [districtId],
          action: 'unassign'
        })
      })
      
      if (response.ok) {
        // Update local state - filter out contacts from the unassigned district
        setUserDistrictContacts(prev => prev.filter(contact => contact.districtName !== districtId))
      } else {
        console.error('Failed to unassign district')
      }
    } catch (error) {
      console.error('Error unassigning district:', error)
    }
  }

  const filteredAvailableDistricts = availableDistricts.filter(district => {
    const searchLower = districtSearchTerm.toLowerCase()
    return (
      district.district_name?.toLowerCase().includes(searchLower) ||
      district.county?.toLowerCase().includes(searchLower)
    )
  })

  // Group district contacts by district
  const groupedDistrictContacts = userDistrictContacts.reduce((acc, contact) => {
    if (!acc[contact.districtName]) {
      acc[contact.districtName] = [];
    }
    acc[contact.districtName].push(contact);
    return acc;
  }, {} as Record<string, UserDistrictContact[]>);

  const handleContactClick = (contact: UserDistrictContact) => {
    setSelectedContact(contact)
    setShowContactDetails(true)
  }

  const handleCloseContactDetails = () => {
    setShowContactDetails(false)
    setSelectedContact(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* District Contacts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">District Contacts</h2>
          {currentUserRole === UserRoleType.admin && (
            <div className="flex space-x-2">
              <button
                onClick={handleOpenAssignDistrictsModal}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Assign Districts
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          {userDistrictContacts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No district contacts assigned</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedDistrictContacts).map(([districtName, contacts]) => (
                <div key={districtName} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="bg-purple-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => {
                      // Toggle visibility of contacts for this district
                      const contactsContainer = document.getElementById(`contacts-${districtName.replace(/\s+/g, '-')}`)
                      if (contactsContainer) {
                        contactsContainer.classList.toggle('hidden')
                      }
                    }}
                  >
                    <div className="font-medium text-purple-800 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {districtName} ({contacts.length} contacts)
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-purple-600 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {currentUserRole === UserRoleType.admin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnassignDistrict(districtName)
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Unassign district"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div id={`contacts-${districtName.replace(/\s+/g, '-')}`} className="hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contacts.map((contact) => (
                            <tr 
                              key={contact.id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleContactClick(contact)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contact.firstName} {contact.lastName}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{contact.email || 'No email'}</div>
                                <div className="text-xs text-gray-500">{contact.phone || 'No phone'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{contact.title || 'No title'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {contact.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* District Contacts with grouping */}
      {Object.entries(groupedDistrictContacts).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">District Contacts</h3>
          </div>
          <div className="p-4">
            {Object.entries(groupedDistrictContacts).map(([districtName, contacts]) => (
              <div key={districtName} className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-2 flex justify-between items-center">
                  <div className="font-medium text-purple-800 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {districtName} ({contacts.length} contacts)
                  </div>
                  {currentUserRole === UserRoleType.admin && (
                    <button
                      onClick={() => handleUnassignDistrict(districtName)}
                      className="text-red-600 hover:text-red-800"
                      title="Unassign district"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Campaign
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.email || 'No email'}</div>
                            <div className="text-xs text-gray-500">{contact.phone || 'No phone'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.title || 'No title'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {contact.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{contact.campaignName || 'No campaign'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Assign Districts Modal */}
      {showAssignDistrictsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Assign Districts</h3>
              <button onClick={handleCloseAssignDistrictsModal} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search districts..."
                  className="bg-transparent border-none focus:outline-none flex-1 text-sm"
                  value={districtSearchTerm}
                  onChange={(e) => setDistrictSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAvailableDistricts.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p>No districts available to assign</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableDistricts.map((district) => (
                    <div 
                      key={district.id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedDistrictsToAssign.includes(district.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleDistrictSelection(district.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {district.district_name}
                          </div>
                          <div className="text-sm text-gray-500">{district.county} County</div>
                          <div className="text-xs text-gray-400">{district.contacts_count || 0} contacts</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border ${
                          selectedDistrictsToAssign.includes(district.id)
                            ? 'bg-blue-500 border-blue-500 flex items-center justify-center'
                            : 'border-gray-300'
                        }`}>
                          {selectedDistrictsToAssign.includes(district.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedDistrictsToAssign.length} districts selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCloseAssignDistrictsModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignDistricts}
                  disabled={selectedDistrictsToAssign.length === 0 || assigningDistricts}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    selectedDistrictsToAssign.length === 0 || assigningDistricts
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {assigningDistricts ? (
                    <span className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Assigning...
                    </span>
                  ) : (
                    'Assign Selected Districts'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {showContactDetails && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
              <button onClick={handleCloseContactDetails} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">First Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.firstName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Last Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.email || 'No email'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.phone || 'No phone'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.title || 'No title'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {selectedContact.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* District Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">District Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">District</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.districtName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Campaign</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedContact.campaignName || 'No campaign'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact ID</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedContact.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Campaign ID</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedContact.campaignId || 'No campaign ID'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseContactDetails}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 