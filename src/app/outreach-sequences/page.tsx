'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { List, Calendar, Target, ChevronRight, Search, Filter, Plus, X, Trash } from 'lucide-react'

interface OutreachSequence {
  id: string
  name: string
  description?: string
  company: string
  created_at: string
  step_count?: number
}

interface Step {
  type: 'email' | 'call' | 'linkedin_message'
  name: string
  contentLink: string
  dayOffset: number
}

function CreateSequenceModal({ 
  isOpen, 
  onClose, 
  company 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  company: string 
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<Step[]>([
    { type: 'email', name: 'Introduction Email', contentLink: '', dayOffset: 0 }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const addStep = () => {
    setSteps([
      ...steps,
      { 
        type: 'email', 
        name: `Step ${steps.length + 1}`, 
        contentLink: '', 
        dayOffset: steps.length > 0 ? steps[steps.length - 1].dayOffset + 3 : 0 
      }
    ])
  }

  const removeStep = (index: number) => {
    const newSteps = [...steps]
    newSteps.splice(index, 1)
    setSteps(newSteps)
  }

  const updateStep = (index: number, field: keyof Step, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!name) {
        setError('Sequence name is required')
        setLoading(false)
        return
      }

      if (steps.length === 0) {
        setError('At least one step is required')
        setLoading(false)
        return
      }

      const response = await fetch('/api/outreach-sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          company,
          steps
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create sequence')
      }

      // Success! Refresh the page
      router.refresh()
      onClose()
    } catch (error) {
      console.error('Error creating sequence:', error)
      setError(error instanceof Error ? error.message : 'Failed to create sequence')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Create Outreach Sequence</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sequence Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., New Client Outreach"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the purpose of this sequence"
              rows={2}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Sequence Steps
              </label>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </button>
            </div>
            
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Step {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="email">Email</option>
                        <option value="call">Call</option>
                        <option value="linkedin_message">LinkedIn Message</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Day Offset
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={step.dayOffset}
                        onChange={(e) => updateStep(index, 'dayOffset', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., Introduction Email"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Content Link (Optional)
                      </label>
                      <input
                        type="text"
                        value={step.contentLink}
                        onChange={(e) => updateStep(index, 'contentLink', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., https://example.com/templates/intro-email"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {steps.length === 0 && (
                <div className="text-center py-4 border border-dashed border-gray-300 rounded-md">
                  <p className="text-gray-500 text-sm">No steps added yet</p>
                  <button
                    type="button"
                    onClick={addStep}
                    className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Step
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OutreachSequencesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedCompany } = useCompany()
  const [sequences, setSequences] = useState<OutreachSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // Check if createSequence query param is present
    if (searchParams.get('createSequence') === 'true') {
      setShowCreateModal(true)
    }
  }, [searchParams])

  useEffect(() => {
    fetchOutreachSequences()
  }, [selectedCompany])

  const fetchOutreachSequences = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      // Fetch outreach sequences using the API endpoint
      const response = await fetch(`/api/outreach-sequences?company=${selectedCompany}`)
      
      if (!response.ok) {
        console.error('Error fetching outreach sequences:', response.status)
        setSequences([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      const sequencesWithSteps = data.sequences || []
      
      // Format the sequences to match our interface
      const formattedSequences = sequencesWithSteps.map((seq: any) => ({
        id: seq.id,
        name: seq.name,
        description: seq.description,
        company: seq.company,
        created_at: seq.createdAt,
        step_count: seq._count?.steps || 0
      }))
      
      setSequences(formattedSequences)
    } catch (error) {
      console.error('Error in fetchOutreachSequences:', error)
      setSequences([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewSequence = (sequence: OutreachSequence) => {
    router.push(`/outreach-sequences/${sequence.id}`)
  }

  const handleCreateSequence = () => {
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    // Remove the query param if it exists
    if (searchParams.get('createSequence')) {
      router.replace('/outreach-sequences')
    }
  }

  const filteredSequences = sequences.filter(sequence => 
    sequence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sequence.description && sequence.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Outreach Sequences</h1>
            <p className="text-gray-600 mt-1">
              View and manage your outreach sequence templates for {selectedCompany}
            </p>
          </div>
          <div>
            <button
              onClick={handleCreateSequence}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Sequence
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sequences..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Sequences List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSequences.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sequences found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No sequences match your search criteria.' : `No outreach sequences found for ${selectedCompany}.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sequence Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Steps
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSequences.map((sequence) => (
                    <tr 
                      key={sequence.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewSequence(sequence)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${sequence.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sequence.name}</div>
                            {sequence.description && (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {sequence.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-semibold">{sequence.step_count} steps</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sequence.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewSequence(sequence)
                          }}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Sequence Modal */}
      <CreateSequenceModal 
        isOpen={showCreateModal} 
        onClose={handleCloseModal} 
        company={selectedCompany || 'Avalern'} 
      />
    </DashboardLayout>
  )
} 