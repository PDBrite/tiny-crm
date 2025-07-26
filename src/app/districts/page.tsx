'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { DistrictLead, DISTRICT_STATUS_DISPLAY_MAP } from '../../types/districts'
import { MapPin, Users, Phone, Mail, Calendar, ChevronRight, Filter, Eye, X, Save, Edit3, Upload, UserPlus, Check } from 'lucide-react'
import { UserRoleType } from '@prisma/client'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRoleType
}

export default function DistrictsPage() {
  const { selectedCompany } = useCompany()
  const router = useRouter()
  
  const [districts, setDistricts] = useState<DistrictLead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [countyFilter, setCountyFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Sidebar states
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictLead | null>(null)
  const [editingDistrict, setEditingDistrict] = useState<DistrictLead | null>(null)
  const [saving, setSaving] = useState(false)
  const [touchpoints, setTouchpoints] = useState<any[]>([])
  const [scheduledTouchpoints, setScheduledTouchpoints] = useState<any[]>([])
  
  // User assignment states
  const [showAssignUsersModal, setShowAssignUsersModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [assignedUsers, setAssignedUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [assigningUsers, setAssigningUsers] = useState(false)
  const [selectedUsersToAssign, setSelectedUsersToAssign] = useState<string[]>([])

  // Fetch current user role
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      try {
        const response = await fetch('/api/auth/verify')
        if (response.ok) {
          const data = await response.json()
          setCurrentUserRole(data.user?.role || null)
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }
    
    fetchCurrentUserRole()
  }, [])
  
  // Redirect if not Avalern
  useEffect(() => {
    console.log('Districts page - checking company:', selectedCompany)
    if (selectedCompany && selectedCompany !== 'Avalern') {
      console.log('Redirecting from districts to leads because company is not Avalern')
      router.push('/leads')
    } else {
      console.log('Company is Avalern, staying on districts page')
    }
  }, [selectedCompany, router])

  // Fetch districts
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setLoading(true)
        console.log('Fetching districts for company:', selectedCompany)
        
        // Build query parameters
        const params = new URLSearchParams()
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
        }
        if (countyFilter !== 'all') {
          params.append('county', countyFilter)
        }
        if (searchTerm) {
          params.append('search', searchTerm)
        }
        if (assignedOnly) {
          params.append('assignedOnly', 'true')
        }
        
        // Fetch from our API endpoint
        console.log('Making API call to:', `/api/districts?${params.toString()}`)
        const response = await fetch(`/api/districts?${params.toString()}`)
        
        console.log('API response status:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Error fetching districts from API:', response.status, errorData)
          setDistricts([])
          return
        }
        
        const data = await response.json()
        console.log('Fetched districts from API:', data)
        
        // Handle the new API response format which returns { districts: [...], totalCount: number }
        const districtsArray = data.districts || data
        
        if (Array.isArray(districtsArray)) {
          setDistricts(districtsArray.map(d => ({
            ...d,
            district_name: d.name || d.district_name, // Handle both name formats
            contacts_count: d.contacts_count || d._count?.contacts || 0,
            valid_contacts_count: d.valid_contacts_count || d.contacts_count || d._count?.contacts || 0,
            status: d.status || 'not_contacted',
            assigned_to_current_user: d.assigned_to_current_user || false,
            assigned_users_count: d.assigned_users_count || 0
          })))
        } else {
          console.error('Invalid districts data format:', data)
          setDistricts([])
        }
      } catch (error) {
        console.error('Error fetching districts:', error)
        setDistricts([])
      } finally {
        setLoading(false)
      }
    }

    if (selectedCompany === 'Avalern') {
      fetchDistricts()
    } else {
      console.log('Not fetching districts because company is not Avalern:', selectedCompany)
    }
  }, [selectedCompany, statusFilter, countyFilter, searchTerm, assignedOnly])

  // Fetch touchpoints for selected district
  const fetchDistrictTouchpoints = async (districtId: string) => {
    try {
      console.log('Fetching district touchpoints for district:', districtId)
      
      // Get all contacts for this district using the API
      const contactsResponse = await fetch(`/api/district-contacts?district_id=${districtId}`)
      
      console.log('District contacts API response status:', contactsResponse.status)
      
      if (!contactsResponse.ok) {
        console.error('Error fetching district contacts from API:', contactsResponse.status)
        
        // Try to get error details
        try {
          const errorData = await contactsResponse.json()
          console.error('Error details:', errorData)
        } catch (e) {
          console.error('Could not parse error response')
        }
        
        return
      }
      
      const contactsData = await contactsResponse.json()
      console.log('District contacts data:', {
        contactsCount: contactsData.contacts?.length || 0,
        firstContact: contactsData.contacts && contactsData.contacts.length > 0 ? contactsData.contacts[0].id : null
      })
      
      const contacts = contactsData.contacts || []
      const contactIds = contacts.map((c: any) => c.id) || []
      
      console.log('Contact IDs for touchpoints:', contactIds.length)
      
      if (contactIds.length === 0) {
        setTouchpoints([])
        setScheduledTouchpoints([])
        return
      }

      // Fetch completed touchpoints
      const completedResponse = await fetch(`/api/touchpoints?district_contact_ids=${contactIds.join(',')}&completed=true`)

      // Fetch scheduled touchpoints
      const scheduledResponse = await fetch(`/api/touchpoints?district_contact_ids=${contactIds.join(',')}&scheduled=true`)

      if (!completedResponse.ok) {
        console.error('Error fetching completed touchpoints:', completedResponse.status)
      } else {
        const completedData = await completedResponse.json()
        setTouchpoints(completedData.touchpoints || [])
      }

      if (!scheduledResponse.ok) {
        console.error('Error fetching scheduled touchpoints:', scheduledResponse.status)
      } else {
        const scheduledData = await scheduledResponse.json()
        setScheduledTouchpoints(scheduledData.touchpoints || [])
      }
    } catch (error) {
      console.error('Error fetching district touchpoints:', error)
    }
  }

  // Get unique counties for filter
  const uniqueCounties = Array.from(new Set(districts.map(d => d.county))).filter(Boolean)

  // Filter districts
  const filteredDistricts = districts.filter(district => {
    const matchesStatus = statusFilter === 'all' || district.status === statusFilter
    const matchesCounty = countyFilter === 'all' || district.county === countyFilter
    const matchesSearch = searchTerm === '' || 
      district.district_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      district.county.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesCounty && matchesSearch
  })

  // Pagination
  const totalPages = Math.ceil(filteredDistricts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, filteredDistricts.length)
  const paginatedDistricts = filteredDistricts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'not_contacted': 'bg-gray-100 text-gray-800',
      'contacted': 'bg-blue-100 text-blue-800',
      'engaged': 'bg-green-100 text-green-800',
      'won': 'bg-emerald-100 text-emerald-800',
      'lost': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.not_contacted
  }

  const handleViewContacts = () => {
    router.push('/leads')
  }

  const handleDistrictClick = async (district: DistrictLead) => {
    setSelectedDistrict(district)
    setEditingDistrict({ ...district })
    await fetchDistrictTouchpoints(district.id)
  }

  const handleCloseSidebar = () => {
    setSelectedDistrict(null)
    setEditingDistrict(null)
    setTouchpoints([])
    setScheduledTouchpoints([])
  }

  const handleSaveDistrict = async () => {
    if (!editingDistrict || !selectedDistrict) return

    try {
      setSaving(true)
      
      const response = await fetch(`/api/districts/${selectedDistrict.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: editingDistrict.status,
          notes: editingDistrict.notes,
          assigned_to: editingDistrict.assigned_to
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error updating district:', errorData)
        alert('Failed to update district')
        return
      }

      // Update local state
      setDistricts(prev => prev.map(d => 
        d.id === selectedDistrict.id 
          ? { ...d, ...editingDistrict }
          : d
      ))
      
      setSelectedDistrict({ ...selectedDistrict, ...editingDistrict })
      alert('District updated successfully')
    } catch (error) {
      console.error('Error updating district:', error)
      alert('Failed to update district')
    } finally {
      setSaving(false)
    }
  }

  // Fetch users for assignment
  const fetchUsersForAssignment = async (districtId: string) => {
    if (!districtId) return
    
    setLoadingUsers(true)
    try {
      // Fetch all users
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      const users = data.users || []
      
      // Fetch users already assigned to this district
      const assignedResponse = await fetch(`/api/districts/${districtId}/assigned-users`)
      if (!assignedResponse.ok) {
        throw new Error('Failed to fetch assigned users')
      }
      
      const assignedData = await assignedResponse.json()
      const assignedUserIds = new Set((assignedData.users || []).map((u: User) => u.id))
      
      // Split users into assigned and available
      const assigned: User[] = []
      const available: User[] = []
      
      users.forEach((user: User) => {
        if (assignedUserIds.has(user.id)) {
          assigned.push(user)
        } else {
          available.push(user)
        }
      })
      
      setAssignedUsers(assigned)
      setAvailableUsers(available)
    } catch (error) {
      console.error('Error fetching users for assignment:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleOpenAssignUsersModal = () => {
    if (!selectedDistrict) return
    
    fetchUsersForAssignment(selectedDistrict.id)
    setShowAssignUsersModal(true)
  }

  const handleCloseAssignUsersModal = () => {
    setShowAssignUsersModal(false)
    setSelectedUsersToAssign([])
  }

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsersToAssign(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const handleAssignUsers = async () => {
    if (!selectedDistrict || selectedUsersToAssign.length === 0) return
    
    setAssigningUsers(true)
    try {
      const response = await fetch(`/api/users/${selectedUsersToAssign[0]}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          districtIds: [selectedDistrict.id],
          action: 'assign'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to assign users')
      }
      
      // Refresh assigned users
      await fetchUsersForAssignment(selectedDistrict.id)
      
      // Update district in the list
      setDistricts(prev => 
        prev.map(d => 
          d.id === selectedDistrict.id 
            ? { ...d, assigned_users_count: (d.assigned_users_count || 0) + selectedUsersToAssign.length }
            : d
        )
      )
      
      setSelectedUsersToAssign([])
    } catch (error) {
      console.error('Error assigning users:', error)
    } finally {
      setAssigningUsers(false)
    }
  }

  const handleUnassignUser = async (userId: string) => {
    if (!selectedDistrict) return
    
    try {
      const response = await fetch(`/api/users/${userId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          districtIds: [selectedDistrict.id],
          action: 'unassign'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to unassign user')
      }
      
      // Update local state
      setAssignedUsers(prev => prev.filter(user => user.id !== userId))
      setAvailableUsers(prev => [...prev, ...assignedUsers.filter(user => user.id === userId)])
      
      // Update district in the list
      setDistricts(prev => 
        prev.map(d => 
          d.id === selectedDistrict.id 
            ? { ...d, assigned_users_count: Math.max(0, (d.assigned_users_count || 0) - 1) }
            : d
        )
      )
    } catch (error) {
      console.error('Error unassigning user:', error)
    }
  }

  // Add this to the JSX where you want to show the "Show only my districts" toggle
  const renderAssignedOnlyToggle = () => {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="assignedOnly"
          checked={assignedOnly}
          onChange={(e) => setAssignedOnly(e.target.checked)}
          className="h-4 w-4 text-purple-600 rounded"
        />
        <label htmlFor="assignedOnly" className="text-sm text-gray-700">
          Show only my districts
        </label>
        </div>
    )
  }

  // Add this to the district detail sidebar to show the "Assign Users" button
  const renderAssignUsersButton = () => {
    if (currentUserRole !== 'admin') return null

  return (
                <button
        onClick={handleOpenAssignUsersModal}
        className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                >
        <UserPlus className="h-4 w-4 mr-1" />
        Assign Users
                </button>
    )
  }

  // Add this to render the assign users modal
  const renderAssignUsersModal = () => {
    if (!showAssignUsersModal) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Assign Users to District</h3>
            <button onClick={handleCloseAssignUsersModal} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
                </button>
            </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">Currently Assigned Users</h4>
                {assignedUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users currently assigned to this district</p>
                ) : (
                  <div className="space-y-2">
                    {assignedUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md">
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                        <button
                          onClick={() => handleUnassignUser(user.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <h4 className="font-medium text-gray-700 mb-2">Available Users</h4>
                {availableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No available users to assign</p>
                ) : (
                  <div className="space-y-2">
                    {availableUsers.map(user => (
                      <div 
                        key={user.id}
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedUsersToAssign.includes(user.id) 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleToggleUserSelection(user.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                  </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">{user.role}</div>
                  </div>
                          <div className={`w-5 h-5 rounded-full border ${
                            selectedUsersToAssign.includes(user.id)
                              ? 'bg-purple-500 border-purple-500 flex items-center justify-center'
                              : 'border-gray-300'
                          }`}>
                            {selectedUsersToAssign.includes(user.id) && (
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
                  {selectedUsersToAssign.length} users selected
                  </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCloseAssignUsersModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignUsers}
                    disabled={selectedUsersToAssign.length === 0 || assigningUsers}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                      selectedUsersToAssign.length === 0 || assigningUsers
                        ? 'bg-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {assigningUsers ? (
                      <span className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Assigning...
                      </span>
                    ) : (
                      'Assign Selected Users'
                    )}
                  </button>
                  </div>
                </div>
            </>
          )}
              </div>
            </div>
    )
  }

  // Update the Filters section to include the assignedOnly toggle
  const renderFilters = () => (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search districts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      {Object.entries(DISTRICT_STATUS_DISPLAY_MAP).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                    <select
                      value={countyFilter}
                      onChange={(e) => setCountyFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">All Counties</option>
                      {uniqueCounties.map(county => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                  </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="assignedOnly"
              checked={assignedOnly}
              onChange={(e) => setAssignedOnly(e.target.checked)}
              className="h-4 w-4 text-purple-600 rounded"
            />
            <label htmlFor="assignedOnly" className="text-sm text-gray-700">
              Show only my districts
            </label>
                </div>
              </div>
            </div>
                </div>
  )

  // Update the district item to show assignment info
  const renderDistrictItem = (district: DistrictLead) => (
                    <div 
                      key={district.id}
                      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleDistrictClick(district)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {district.district_name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(district.status)}`}>
                              {DISTRICT_STATUS_DISPLAY_MAP[district.status as keyof typeof DISTRICT_STATUS_DISPLAY_MAP]}
                            </span>
            {district.assigned_to_current_user && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Assigned to you
              </span>
            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{district.county} County</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{district.contacts_count} total contacts</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-4 w-4" />
                              <span>{district.valid_contacts_count} valid contacts</span>
                            </div>
                          </div>
                          
                          {district.campaign && (
                            <div className="mt-2 flex items-center space-x-1 text-sm text-blue-600">
                              <Calendar className="h-4 w-4" />
                              <span>Campaign: {district.campaign.name}</span>
                            </div>
                          )}
                          
          {district.assigned_users_count && district.assigned_users_count > 0 && (
                            <div className="mt-1">
                              <span className="text-sm text-gray-600">
                <UserPlus className="h-4 w-4 inline mr-1" />
                {district.assigned_users_count} assigned users
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/leads?district=${district.id}`)
                            }}
                            className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            View Contacts
                          </button>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
  )

  // Update the district detail sidebar to include the assign users button
  const renderDistrictDetailSidebar = () => {
    if (!selectedDistrict || !editingDistrict) return null;
    
    return (
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">District Details</h2>
          <button
            onClick={handleCloseSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{selectedDistrict.district_name}</h3>
              {currentUserRole === 'admin' && (
                <button
                  onClick={() => router.push(`/users?assignDistrict=${selectedDistrict.id}`)}
                  className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Assign Users
                </button>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{selectedDistrict.county} County</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{selectedDistrict.contacts_count} contacts ({selectedDistrict.valid_contacts_count} valid)</span>
              </div>
              {selectedDistrict.assigned_users_count && selectedDistrict.assigned_users_count > 0 && (
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4 text-gray-400" />
                  <span>{selectedDistrict.assigned_users_count} assigned users</span>
                </div>
              )}
              {selectedDistrict.assigned_to_current_user && (
                <div className="mt-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md inline-block">
                  Assigned to you
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={editingDistrict.status}
                onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {Object.entries(DISTRICT_STATUS_DISPLAY_MAP).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
                </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
              <input
                type="text"
                value={editingDistrict.assigned_to || ''}
                onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, assigned_to: e.target.value } : null)}
                placeholder="Enter assignee name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editingDistrict.notes || ''}
                onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, notes: e.target.value } : null)}
                placeholder="Add notes about this district..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveDistrict}
              disabled={saving}
              className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Touchpoints */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Touchpoints</h4>
            
            {/* Completed Touchpoints */}
            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Completed ({touchpoints.length})
              </h5>
              {touchpoints.length === 0 ? (
                <p className="text-sm text-gray-500">No completed touchpoints yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {touchpoints.map((touchpoint) => (
                    <div key={touchpoint.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {touchpoint.district_contact?.first_name} {touchpoint.district_contact?.last_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(touchpoint.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>{touchpoint.type} • {touchpoint.outcome}</div>
                        {touchpoint.notes && <div className="mt-1">{touchpoint.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Touchpoints */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Scheduled ({scheduledTouchpoints.length})
              </h5>
              {scheduledTouchpoints.length === 0 ? (
                <p className="text-sm text-gray-500">No scheduled touchpoints</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {scheduledTouchpoints.map((touchpoint) => (
                    <div key={touchpoint.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {touchpoint.district_contact?.first_name} {touchpoint.district_contact?.last_name}
                        </span>
                        <span className="text-xs text-blue-600">
                          {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>{touchpoint.type}</div>
                        {touchpoint.notes && <div className="mt-1">{touchpoint.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedCompany !== 'Avalern') {
    return null // Will redirect
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${selectedDistrict ? 'w-2/3' : 'w-full'}`}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  School Districts ({districts.length})
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage and track your school district outreach for Avalern
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/import')}
                  className="flex items-center px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import School Districts
                </button>
                <button
                  onClick={handleViewContacts}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Contacts
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Districts</p>
                    <p className="text-2xl font-bold text-gray-900">{districts.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {districts.reduce((sum, d) => sum + (d.contacts_count || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Engaged Districts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {districts.filter(d => d.status === 'engaged').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Mail className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Won Districts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {districts.filter(d => d.status === 'won').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            {renderFilters()}

            {/* Districts List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {filteredDistricts.length === 0 ? (
                <div className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No districts found</h3>
                  <p className="text-gray-600 mb-4">
                    {districts.length === 0 
                      ? 'Import district data to get started with your school district outreach.'
                      : 'Try adjusting your search criteria or filters.'
                    }
                  </p>
                  <button
                    onClick={() => router.push('/import')}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Import Districts
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {paginatedDistricts.map(district => renderDistrictItem(district))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">
                      Showing {startIndex}-{endIndex} of {filteredDistricts.length} districts
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                        if (pageNum > totalPages) return null
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              pageNum === currentPage
                                ? 'bg-purple-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* District Detail Sidebar */}
        {selectedDistrict && editingDistrict && (
          <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">District Details</h2>
              <button
                onClick={handleCloseSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDistrict.district_name}</h3>
                  {currentUserRole === 'admin' && (
                    <button
                      onClick={() => router.push(`/users?assignDistrict=${selectedDistrict.id}`)}
                      className="flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign Users
                    </button>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{selectedDistrict.county} County</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{selectedDistrict.contacts_count} contacts ({selectedDistrict.valid_contacts_count} valid)</span>
                  </div>
                  {selectedDistrict.assigned_users_count && selectedDistrict.assigned_users_count > 0 && (
                    <div className="flex items-center space-x-2">
                      <UserPlus className="h-4 w-4 text-gray-400" />
                      <span>{selectedDistrict.assigned_users_count} assigned users</span>
                    </div>
                  )}
                  {selectedDistrict.assigned_to_current_user && (
                    <div className="mt-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md inline-block">
                      Assigned to you
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={editingDistrict.status}
                    onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(DISTRICT_STATUS_DISPLAY_MAP).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                  <input
                    type="text"
                    value={editingDistrict.assigned_to || ''}
                    onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, assigned_to: e.target.value } : null)}
                    placeholder="Enter assignee name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editingDistrict.notes || ''}
                    onChange={(e) => setEditingDistrict(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Add notes about this district..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleSaveDistrict}
                  disabled={saving}
                  className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {/* Touchpoints */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Touchpoints</h4>
                
                {/* Completed Touchpoints */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Completed ({touchpoints.length})
                  </h5>
                  {touchpoints.length === 0 ? (
                    <p className="text-sm text-gray-500">No completed touchpoints yet</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {touchpoints.map((touchpoint) => (
                        <div key={touchpoint.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {touchpoint.district_contact?.first_name} {touchpoint.district_contact?.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(touchpoint.completed_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <div>{touchpoint.type} • {touchpoint.outcome}</div>
                            {touchpoint.notes && <div className="mt-1">{touchpoint.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scheduled Touchpoints */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Scheduled ({scheduledTouchpoints.length})
                  </h5>
                  {scheduledTouchpoints.length === 0 ? (
                    <p className="text-sm text-gray-500">No scheduled touchpoints</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {scheduledTouchpoints.map((touchpoint) => (
                        <div key={touchpoint.id} className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {touchpoint.district_contact?.first_name} {touchpoint.district_contact?.last_name}
                            </span>
                            <span className="text-xs text-blue-600">
                              {new Date(touchpoint.scheduled_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <div>{touchpoint.type}</div>
                            {touchpoint.notes && <div className="mt-1">{touchpoint.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Users Modal */}
      {renderAssignUsersModal()}
    </DashboardLayout>
  )
} 