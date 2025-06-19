'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/contexts/CompanyContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { List, Calendar, Target, ChevronRight, Search, Filter } from 'lucide-react'

interface OutreachSequence {
  id: string
  name: string
  description?: string
  company: string
  created_at: string
  step_count?: number
}

export default function OutreachSequencesPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const [sequences, setSequences] = useState<OutreachSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOutreachSequences()
  }, [selectedCompany])

  const fetchOutreachSequences = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      // Fetch outreach sequences
      const { data: sequencesData, error: sequencesError } = await supabase
        .from('outreach_sequences')
        .select('id, name, description, company, created_at')
        .eq('company', selectedCompany)
        .order('created_at', { ascending: false })

      if (sequencesError) {
        console.error('Error fetching outreach sequences:', sequencesError)
        setSequences([])
        setLoading(false)
        return
      }

      // For each sequence, count the number of steps
      const enrichedSequences = await Promise.all(
        (sequencesData || []).map(async (sequence) => {
          const { count, error: countError } = await supabase
            .from('outreach_steps')
            .select('id', { count: 'exact', head: true })
            .eq('sequence_id', sequence.id)

          return {
            ...sequence,
            step_count: countError ? 0 : (count || 0)
          }
        })
      )

      setSequences(enrichedSequences)
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
    </DashboardLayout>
  )
} 