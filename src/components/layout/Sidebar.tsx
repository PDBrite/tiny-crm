'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCompany } from '@/contexts/CompanyContext'
import {
  LayoutDashboard,
  Users,
  Target,
  Upload,
  Building2,
  School,
  MessageSquare,
  User,
  List,
  LogOut,
  Mail
} from 'lucide-react'
import { signOut, useSession } from "next-auth/react"

const avalernNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Districts', href: '/districts', icon: School },
  { name: 'District Contacts', href: '/leads', icon: Users },
  { name: 'Outreach', href: '/outreach', icon: MessageSquare },
  { name: 'Campaigns', href: '/campaigns', icon: Target },
  { name: 'Inboxes', href: '/inboxes', icon: Mail },
  { name: 'Outreach Sequences', href: '/outreach-sequences', icon: List },
  { name: 'Users', href: '/users', icon: User },
  { name: 'Import', href: '/import', icon: Upload },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { selectedCompany } = useCompany()
  const { data: session } = useSession();
  const user = session?.user;

  // Debug logging removed

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  // Only show Users section if user is admin
  const filteredNav = avalernNav.filter(item => {
    if (item.name === 'Users') {
      return user?.role === 'admin';
    }
    return true;
  });

  return (
    <div className="flex h-screen w-64 flex-col bg-white shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Building2 className="h-8 w-8 text-purple-600" />
        <span className="ml-3 text-xl font-bold text-gray-900">Avalern</span>
      </div>

      {/* User Info */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNav.map((item) => {
          // Improved active state detection with better logic
          let isActive = false
          
          if (item.href === '/') {
            // Dashboard is active for root path or dashboard path
            isActive = pathname === '/' || pathname === '/dashboard'
          } else if (item.href === '/campaigns') {
            // Campaigns is active for campaigns and related paths, but not for select pages
            isActive = pathname.startsWith('/campaigns') && 
                      !pathname.includes('/select-leads') && 
                      !pathname.includes('/select-districts')
          } else if (item.href === '/leads') {
            // Leads is active for leads and district-contacts
            isActive = pathname.startsWith('/leads') || pathname.startsWith('/district-contacts')
          } else {
            // For other items, check if path starts with href
            isActive = pathname.startsWith(item.href)
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}

              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign out button */}
      <div className="mt-auto border-t border-gray-200 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400" />
          Sign Out
        </button>
      </div>
    </div>
  )
} 