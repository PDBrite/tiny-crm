'use client'

import { useState, useEffect } from 'react'
import { Search, MapPin, Check, AlertCircle, UserPlus } from 'lucide-react'

interface District {
  id: string
  district_name: string
  county: string
  contacts_count?: number
  campaign?: {
    id: string
    name: string
  }
}

interface AssignLeadsTabProps {
  selectedUser: string | null
  currentUserRole: any
}

export default function AssignLeadsTab({ selectedUser, currentUserRole }: AssignLeadsTabProps) {
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  // Fetch all districts
  useEffect(() => {
    const fetchDistricts = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/districts?limit=1000')
        if (response.ok) {
          const data = await response.json()
          setDistricts(data.districts || [])
        } else {
          console.error('Failed to fetch districts')
        }
      } catch (error) {
        console.error('Error fetching districts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDistricts()
  }, [])

  const handleToggleDistrictSelection = (districtId: string) => {
    setSelectedDistricts(prev => 
      prev.includes(districtId) 
        ? prev.filter(id => id !== districtId) 
        : [...prev, districtId]
    )
  }

  const handleAssignDistricts = async () => {
    if (!selectedUser || selectedDistricts.length === 0) return
    
    setAssigning(true)
    try {
      const response = await fetch(`/api/users/${selectedUser}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          districtIds: selectedDistricts,
          action: 'assign'
        })
      })
      
      if (response.ok) {
        // Clear selection after successful assignment
        setSelectedDistricts([])
        alert('Districts assigned successfully!')
      } else {
        console.error('Failed to assign districts')
        alert('Failed to assign districts. Please try again.')
      }
    } catch (error) {
      console.error('Error assigning districts:', error)
      alert('Error assigning districts. Please try again.')
    } finally {
      setAssigning(false)
    }
  }

  const filteredDistricts = districts.filter(district => {
    const searchLower = searchTerm.toLowerCase()
    return (
      district.district_name?.toLowerCase().includes(searchLower) ||
      district.county?.toLowerCase().includes(searchLower) ||
      district.campaign?.name?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Assign Districts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Search and select districts to assign to the selected user
          </p>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center bg-gray-100 rounded-md px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search districts by name, county, or campaign..."
              className="bg-transparent border-none focus:outline-none flex-1 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-4">
          {filteredDistricts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p>No districts found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredDistricts.map((district) => (
                <div 
                  key={district.id}
                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                    selectedDistricts.includes(district.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleDistrictSelection(district.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="font-medium text-gray-900">
                          {district.district_name}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {district.county} County
                      </div>
                      {district.campaign && (
                        <div className="text-xs text-gray-400 mt-1">
                          Campaign: {district.campaign.name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {district.contacts_count || 0} contacts
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedDistricts.includes(district.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedDistricts.includes(district.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedDistricts.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedDistricts.length} district{selectedDistricts.length !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleAssignDistricts}
                disabled={assigning}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                  assigning
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {assigning ? (
                  <span className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Assigning...
                  </span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Selected Districts
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 