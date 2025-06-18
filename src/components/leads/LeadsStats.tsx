'use client'

import { Users, Mail, Phone, Calendar } from 'lucide-react'
import { Lead } from '../../types/leads'

interface LeadsStatsProps {
  leads: Lead[]
}

export default function LeadsStats({ leads }: LeadsStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            <p className="text-sm text-gray-600">Total Leads</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Mail className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {leads.filter(lead => lead.status === 'emailed').length}
            </p>
            <p className="text-sm text-gray-600">Emails Sent</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Phone className="h-8 w-8 text-orange-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {leads.filter(lead => lead.status === 'called').length}
            </p>
            <p className="text-sm text-gray-600">Calls Made</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {leads.filter(lead => lead.status === 'booked').length}
            </p>
            <p className="text-sm text-gray-600">Meetings Scheduled</p>
          </div>
        </div>
      </div>
    </div>
  )
} 