'use client'

import { Mail, Phone, MessageSquare, CheckCircle } from 'lucide-react'

interface CampaignStatsProps {
  campaign: {
    emailsSent: number
    callsMade: number
    linkedinMessages?: number
    appointmentsBooked: number
  }
}

export default function CampaignStats({ campaign }: CampaignStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Mail className="h-8 w-8 text-green-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{campaign.emailsSent}</p>
            <p className="text-sm text-gray-600">Emails Sent</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <Phone className="h-8 w-8 text-orange-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{campaign.callsMade}</p>
            <p className="text-sm text-gray-600">Calls Made</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{campaign.linkedinMessages || 0}</p>
            <p className="text-sm text-gray-600">LinkedIn Messages</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <CheckCircle className="h-8 w-8 text-emerald-600 mr-3" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{campaign.appointmentsBooked}</p>
            <p className="text-sm text-gray-600">Engaged Leads</p>
          </div>
        </div>
      </div>
    </div>
  )
} 