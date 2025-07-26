'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { User, Mail, Phone, Calendar, UserPlus, Search, X, Check, AlertCircle, MapPin } from 'lucide-react'
import { UserRoleType } from '@prisma/client'

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRoleType
  createdAt: string
  companyAccess: { company: string }[]
}

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

interface UserLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  status: string
  campaignId?: string
  campaignName?: string
}

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

export default function UsersPage() {
  const { selectedCompany } = useCompany()
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [userTouchpoints, setUserTouchpoints] = useState<UserTouchpoint[]>([])
  const [userLeads, setUserLeads] = useState<UserLead[]>([])
  const [userDistrictContacts, setUserDistrictContacts] = useState<UserDistrictContact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleType | null>(null)
  
  // Lead assignment states
  const [showAssignLeadsModal, setShowAssignLeadsModal] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<UserLead[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeadsToAssign, setSelectedLeadsToAssign] = useState<string[]>([])
  const [assigningLeads, setAssigningLeads] = useState(false)

  // Add a new state for district assignment
  const [showAssignDistrictsModal, setShowAssignDistrictsModal] = useState(false)
  const [availableDistricts, setAvailableDistricts] = useState<any[]>([])
  const [selectedDistrictsToAssign, setSelectedDistrictsToAssign] = useState<string[]>([])
  const [assigningDistricts, setAssigningDistricts] = useState(false)
  const [districtSearchTerm, setDistrictSearchTerm] = useState('')
  const [districtToAssign, setDistrictToAssign] = useState<string | null>(null)

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

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
        } else {
          console.error('Failed to fetch users')
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [selectedCompany])

  // Fetch user details when a user is selected
  useEffect(() => {
    if (!selectedUser) {
      setUserTouchpoints([])
      setUserLeads([])
      setUserDistrictContacts([])
      return
    }

    const fetchUserDetails = async () => {
      setLoadingDetails(true)
      try {
        // Fetch user touchpoints
        const touchpointsResponse = await fetch(`/api/users/${selectedUser}/touchpoints`)
        if (touchpointsResponse.ok) {
          const data = await touchpointsResponse.json()
          setUserTouchpoints(data.touchpoints || [])
        }

        // Fetch user leads
        const leadsResponse = await fetch(`/api/users/${selectedUser}/leads`)
        if (leadsResponse.ok) {
          const data = await leadsResponse.json()
          setUserLeads(data.leads || [])
          setUserDistrictContacts(data.districtContacts || [])
        }
      } catch (error) {
        console.error('Error fetching user details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    fetchUserDetails()
  }, [selectedUser])

  // Update useEffect to check for districtToAssign from URL and auto-select user
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const assignDistrictId = searchParams.get('assignDistrict')
    
    if (assignDistrictId) {
      setDistrictToAssign(assignDistrictId)
      
      // If we have a district to assign and users are loaded, show the modal
      if (users.length > 0) {
        // If no user is selected, select the first admin user or the first user
        if (!selectedUser) {
          const adminUser = users.find(user => user.role === UserRoleType.admin)
          const userToSelect = adminUser ? adminUser.id : users[0].id
          setSelectedUser(userToSelect)
          
          // Wait a moment for the user selection to take effect
          setTimeout(() => {
            setSelectedDistrictsToAssign([assignDistrictId])
            setShowAssignDistrictsModal(true)
          }, 500)
        } else {
          setSelectedDistrictsToAssign([assignDistrictId])
          setShowAssignDistrictsModal(true)
        }
      }
    }
  }, [districtToAssign, users, selectedUser])

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId === selectedUser ? null : userId)
  }

  // Fetch available leads for assignment
  const fetchAvailableLeads = async () => {
    try {
      const response = await fetch('/api/leads?limit=100')
      if (response.ok) {
        const data = await response.json()
        // Filter out leads that are already assigned to the user
        const userLeadIds = new Set(userLeads.map(lead => lead.id))
        const filteredLeads = data.leads
          .filter((lead: any) => !userLeadIds.has(lead.id))
          .map((lead: any) => ({
            id: lead.id,
            firstName: lead.firstName || lead.first_name,
            lastName: lead.lastName || lead.last_name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            status: lead.status,
            campaignId: lead.campaignId,
            campaignName: lead.campaign?.name
          }))
        setAvailableLeads(filteredLeads)
      }
    } catch (error) {
      console.error('Error fetching available leads:', error)
    }
  }

  const handleOpenAssignLeadsModal = () => {
    fetchAvailableLeads()
    setShowAssignLeadsModal(true)
  }

  const handleCloseAssignLeadsModal = () => {
    setShowAssignLeadsModal(false)
    setSelectedLeadsToAssign([])
    setSearchTerm('')
  }

  const handleToggleLeadSelection = (leadId: string) => {
    setSelectedLeadsToAssign(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId) 
        : [...prev, leadId]
    )
  }

  const handleAssignLeads = async () => {
    if (!selectedUser || selectedLeadsToAssign.length === 0) return
    
    setAssigningLeads(true)
    try {
      const response = await fetch(`/api/users/${selectedUser}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: selectedLeadsToAssign,
          action: 'assign'
        })
      })
      
      if (response.ok) {
        // Refresh user leads
        const leadsResponse = await fetch(`/api/users/${selectedUser}/leads`)
        if (leadsResponse.ok) {
          const data = await leadsResponse.json()
          setUserLeads(data.leads || [])
          setUserDistrictContacts(data.districtContacts || [])
        }
        handleCloseAssignLeadsModal()
      } else {
        console.error('Failed to assign leads')
      }
    } catch (error) {
      console.error('Error assigning leads:', error)
    } finally {
      setAssigningLeads(false)
    }
  }

  const handleUnassignLead = async (leadId: string) => {
    if (!selectedUser) return
    
    try {
      const response = await fetch(`/api/users/${selectedUser}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: [leadId],
          action: 'unassign'
        })
      })
      
      if (response.ok) {
        // Update local state
        setUserLeads(prev => prev.filter(lead => lead.id !== leadId))
      } else {
        console.error('Failed to unassign lead')
      }
    } catch (error) {
      console.error('Error unassigning lead:', error)
    }
  }

  // Add this after fetchAvailableLeads function
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

  // Add this after handleOpenAssignLeadsModal function
  const handleOpenAssignDistrictsModal = () => {
    fetchAvailableDistricts()
    setShowAssignDistrictsModal(true)
  }

  // Add this after handleCloseAssignLeadsModal function
  const handleCloseAssignDistrictsModal = () => {
    setShowAssignDistrictsModal(false)
    setSelectedDistrictsToAssign([])
    setDistrictSearchTerm('')
  }

  // Add this after handleToggleLeadSelection function
  const handleToggleDistrictSelection = (districtId: string) => {
    setSelectedDistrictsToAssign(prev => 
      prev.includes(districtId) 
        ? prev.filter(id => id !== districtId) 
        : [...prev, districtId]
    )
  }

  // Add this after handleAssignLeads function
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
          setUserLeads(data.leads || [])
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

  // Add this after handleUnassignLead function
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

  const filteredAvailableLeads = availableLeads.filter(lead => {
    const searchLower = searchTerm.toLowerCase()
    return (
      lead.firstName?.toLowerCase().includes(searchLower) ||
      lead.lastName?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.company?.toLowerCase().includes(searchLower)
    )
  })

  // Add this after filteredAvailableLeads
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-500">Manage users and view their activities</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Users List */}
          <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No users found</div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedUser === user.id ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => handleSelectUser(user.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.firstName || ''} {user.lastName || ''}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <div className="mt-1 flex items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            user.role === UserRoleType.admin 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="w-2/3">
            {selectedUser ? (
              loadingDetails ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* User Touchpoints */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Touchpoints</h2>
                    </div>
                    <div className="p-4">
                      {userTouchpoints.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No touchpoints found</div>
                      ) : (
                        <div className="overflow-x-auto">
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
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {userTouchpoints.map((touchpoint) => {
                                const contact = touchpoint.lead || touchpoint.district_contact
                                return (
                                  <tr key={touchpoint.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {touchpoint.type === 'email' ? (
                                          <Mail className="h-4 w-4 text-blue-500 mr-1" />
                                        ) : touchpoint.type === 'call' ? (
                                          <Phone className="h-4 w-4 text-green-500 mr-1" />
                                        ) : (
                                          <Mail className="h-4 w-4 text-purple-500 mr-1" />
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
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Leads */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Assigned Leads</h2>
                      {currentUserRole === UserRoleType.admin && (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleOpenAssignLeadsModal}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign Leads
                          </button>
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
                      {userLeads.length === 0 && userDistrictContacts.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No leads assigned</div>
                      ) : (
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
                                  Company/District
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Campaign
                                </th>
                                {currentUserRole === UserRoleType.admin && (
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {/* Regular Leads */}
                              {userLeads.map((lead) => (
                                <tr key={lead.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                      {lead.firstName} {lead.lastName}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{lead.email}</div>
                                    <div className="text-xs text-gray-500">{lead.phone || 'No phone'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{lead.company || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {lead.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{lead.campaignName || 'No campaign'}</div>
                                  </td>
                                  {currentUserRole === UserRoleType.admin && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <button
                                        onClick={() => handleUnassignLead(lead.id)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Unassign lead"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}

                              {/* District Contacts */}
                              {userDistrictContacts.map((contact) => (
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
                                    <div className="text-sm text-gray-900">{contact.districtName}</div>
                                    <div className="text-xs text-gray-500">{contact.title || 'No title'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {contact.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{contact.campaignName || 'No campaign'}</div>
                                  </td>
                                  {currentUserRole === UserRoleType.admin && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      {/* Add unassign button for district contacts if needed */}
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-center text-gray-500">
                  <User className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No user selected</h3>
                  <p className="mt-1 text-sm text-gray-500">Select a user to view their details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Leads Modal */}
      {showAssignLeadsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Assign Leads</h3>
              <button onClick={handleCloseAssignLeadsModal} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="bg-transparent border-none focus:outline-none flex-1 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAvailableLeads.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p>No leads available to assign</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableLeads.map((lead) => (
                    <div 
                      key={lead.id}
                      className={`p-3 border rounded-md cursor-pointer ${
                        selectedLeadsToAssign.includes(lead.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleToggleLeadSelection(lead.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                          <div className="text-xs text-gray-400">{lead.company || 'No company'}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border ${
                          selectedLeadsToAssign.includes(lead.id)
                            ? 'bg-blue-500 border-blue-500 flex items-center justify-center'
                            : 'border-gray-300'
                        }`}>
                          {selectedLeadsToAssign.includes(lead.id) && (
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
                {selectedLeadsToAssign.length} leads selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCloseAssignLeadsModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignLeads}
                  disabled={selectedLeadsToAssign.length === 0 || assigningLeads}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    selectedLeadsToAssign.length === 0 || assigningLeads
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {assigningLeads ? (
                    <span className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Assigning...
                    </span>
                  ) : (
                    'Assign Selected Leads'
                  )}
                </button>
              </div>
            </div>
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

      {/* District Contacts with grouping */}
      {Object.entries(groupedDistrictContacts).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">District Contacts</h3>
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
      )}
    </DashboardLayout>
  )
} 