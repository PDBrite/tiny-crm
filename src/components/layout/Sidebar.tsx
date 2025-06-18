'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Upload, 
  Settings,
  Building2,
  Calendar,
  School,
  MessageSquare,
  User
} from 'lucide-react'

const craftyCodeNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Import', href: '/import', icon: Upload },
]

const avalernNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Districts', href: '/districts', icon: School },
  { name: 'District Contacts', href: '/leads', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Import', href: '/import', icon: Upload },
]

const companyColors: Record<string, string> = {
  'CraftyCode': 'bg-blue-500',
  'Avalern': 'bg-purple-500'
}

export default function Sidebar() {
  const pathname = usePathname()
  const { selectedCompany, setSelectedCompany, availableCompanies } = useCompany()

  return (
    <div className="flex h-screen w-64 flex-col bg-white shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Building2 className="h-8 w-8 text-blue-600" />
        <span className="ml-3 text-xl font-bold text-gray-900">Lead Manager</span>
      </div>

      {/* User Info */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Current User
            </p>
            <p className="text-xs text-gray-500 truncate">
              User
            </p>
          </div>
        </div>
      </div>

      {/* Company Selector */}
      {availableCompanies.length > 0 && (
        <div className="border-b border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Active Companies
          </div>
          <div className="space-y-2">
            {availableCompanies.map((company) => (
              <button
                key={company}
                onClick={() => setSelectedCompany(company)}
                className={`
                  flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${selectedCompany === company
                    ? 'bg-gray-100 text-gray-900 border-l-4 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className={`w-3 h-3 ${companyColors[company] || 'bg-gray-500'} rounded-full mr-3`}></div>
                <span>{company}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {selectedCompany === 'CraftyCode' && craftyCodeNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
        {selectedCompany === 'Avalern' && avalernNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
} 