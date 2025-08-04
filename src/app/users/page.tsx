'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useCompany } from '../../contexts/CompanyContext'
import { User } from 'lucide-react'
import { UserRoleType } from '@prisma/client'
import UserTabs from '../../components/users/UserTabs'

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRoleType
  createdAt: string
  companyAccess: { company: string }[]
}

export default function UsersPage() {
  const { selectedCompany } = useCompany()
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleType | null>(null)

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



  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId === selectedUser ? null : userId)
  }

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
            <UserTabs 
              selectedUser={selectedUser} 
              currentUserRole={currentUserRole} 
            />
          </div>
        </div>
      </div>


    </DashboardLayout>
  )
} 