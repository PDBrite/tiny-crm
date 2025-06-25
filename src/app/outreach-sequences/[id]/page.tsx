'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Calendar, Mail, Phone, MessageSquare, Clock, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react'

interface OutreachSequence {
  id: string
  name: string
  description?: string
  company: string
  created_at: string
}

interface OutreachStep {
  id: string
  sequence_id: string
  step_order: number
  type: 'email' | 'call' | 'linkedin_message' | 'meeting'
  name?: string
  content_link?: string
  day_offset: number
  days_after_previous?: number
  created_at: string
}

export default function OutreachSequenceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sequenceId = params.id as string
  
  const [sequence, setSequence] = useState<OutreachSequence | null>(null)
  const [steps, setSteps] = useState<OutreachStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sequenceId) {
      fetchSequenceDetails()
    }
  }, [sequenceId])

  const fetchSequenceDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch sequence details
      const { data: sequenceData, error: sequenceError } = await supabase
        .from('outreach_sequences')
        .select('*')
        .eq('id', sequenceId)
        .single()
      
      if (sequenceError) {
        console.error('Error fetching sequence:', sequenceError)
        setError('Failed to load sequence details')
        setLoading(false)
        return
      }
      
      setSequence(sequenceData)
      
      // Fetch sequence steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('outreach_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true })
      
      if (stepsError) {
        console.error('Error fetching steps:', stepsError)
        setError('Failed to load sequence steps')
        setSteps([])
      } else {
        setSteps(stepsData || [])
      }
    } catch (error) {
      console.error('Error in fetchSequenceDetails:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-500" />
      case 'call':
        return <Phone className="h-5 w-5 text-green-500" />
      case 'linkedin_message':
        return <MessageSquare className="h-5 w-5 text-blue-700" />
      case 'meeting':
        return <Calendar className="h-5 w-5 text-purple-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const formatStepType = (type: string) => {
    switch (type) {
      case 'email':
        return 'Email'
      case 'call':
        return 'Phone Call'
      case 'linkedin_message':
        return 'LinkedIn Message'
      case 'meeting':
        return 'Meeting'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
    }
  }

  const handleBack = () => {
    router.push('/outreach-sequences')
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

  if (error || !sequence) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Sequence not found'}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sequences
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{sequence.name}</h1>
            <p className="text-gray-600 mt-1">
              {sequence.description || 'No description provided'}
            </p>
          </div>
        </div>

        {/* Sequence Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${sequence.company === 'CraftyCode' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
              <h2 className="text-lg font-semibold text-gray-800">{sequence.company}</h2>
            </div>
            <div className="text-sm text-gray-500">
              Created on {new Date(sequence.created_at).toLocaleDateString()}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sequence Timeline</h3>
            
            {steps.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No steps defined for this sequence</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {/* Steps */}
                <div className="space-y-8">
                  {steps.map((step, index) => (
                    <div key={step.id} className="relative pl-14">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-0 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-200">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50">
                          {getStepIcon(step.type)}
                        </div>
                      </div>
                      
                      {/* Step content */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                              Day {step.day_offset}
                            </span>
                            {step.days_after_previous !== undefined && step.step_order > 1 && (
                              <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                +{step.days_after_previous} days after previous
                              </span>
                            )}
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              Step {step.step_order}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            {formatStepType(step.type)}
                          </div>
                        </div>
                        
                        <h4 className="text-base font-medium text-gray-900 mb-2">
                          {step.name || `${formatStepType(step.type)} Touchpoint`}
                        </h4>
                        
                        {step.content_link && (
                          <div className="mt-2">
                            <a 
                              href={step.content_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                            >
                              View Content Template
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 