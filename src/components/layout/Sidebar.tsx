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
  MessageSquare
} from 'lucide-react'

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Outreach', href: '/outreach', icon: Calendar },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const craftyCodeNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const avalernNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Districts', href: '/districts', icon: School },
  { name: 'District Contacts', href: '/leads', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings }
]

const companies = [
  { name: 'CraftyCode', color: 'bg-blue-500' },
  { name: 'Avalern', color: 'bg-purple-500' }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { selectedCompany, setSelectedCompany } = useCompany()

  return (
    <div className="flex h-screen w-64 flex-col bg-white shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Building2 className="h-8 w-8 text-blue-600" />
        <span className="ml-3 text-xl font-bold text-gray-900">Lead Manager</span>
      </div>

      {/* Company Selector - Moved to top */}
      <div className="border-b border-gray-200 p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Active Companies
        </div>
        <div className="space-y-2">
          {companies.map((company) => (
            <button
              key={company.name}
              onClick={() => setSelectedCompany(company.name)}
              className={`
                flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${selectedCompany === company.name
                  ? 'bg-gray-100 text-gray-900 border-l-4 border-blue-500'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className={`w-3 h-3 ${company.color} rounded-full mr-3`}></div>
              <span>{company.name}</span>
            </button>
          ))}
        </div>
      </div>

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