'use client'

import { useState } from 'react'
import { User, MapPin, Calendar, BarChart3 } from 'lucide-react'
import CurrentAssignedLeadsTab from './CurrentAssignedLeadsTab'
import AssignLeadsTab from './AssignLeadsTab'
import TouchpointsTab from './TouchpointsTab'
import AnalyticsTab from './AnalyticsTab'
import { UserRoleType } from '@prisma/client'

interface UserTabsProps {
  selectedUser: string | null
  currentUserRole: UserRoleType | null
}

const tabs = [
  {
    id: 'assigned',
    name: 'Current Assigned Leads',
    icon: User,
    component: CurrentAssignedLeadsTab
  },
  {
    id: 'assign',
    name: 'Assign Districts',
    icon: MapPin,
    component: AssignLeadsTab
  },
  {
    id: 'touchpoints',
    name: 'Touchpoints',
    icon: Calendar,
    component: TouchpointsTab
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: BarChart3,
    component: AnalyticsTab
  }
]

export default function UserTabs({ selectedUser, currentUserRole }: UserTabsProps) {
  const [activeTab, setActiveTab] = useState('assigned')

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">
          <User className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No user selected</h3>
          <p className="mt-1 text-sm text-gray-500">Select a user to view their details</p>
        </div>
      </div>
    )
  }

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {ActiveComponent && (
          <ActiveComponent 
            selectedUser={selectedUser} 
            currentUserRole={currentUserRole} 
          />
        )}
      </div>
    </div>
  )
} 