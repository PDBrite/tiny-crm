'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface CompanyContextType {
  selectedCompany: string
  setSelectedCompany: (company: string) => void
  isLoading: boolean
  availableCompanies: string[]
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string>('')
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') {
      console.log('CompanyContext: Session is loading');
      return;
    }

    if (status === 'unauthenticated') {
      console.log('CompanyContext: User is unauthenticated');
      setIsLoading(false)
      return;
    }

    console.log('CompanyContext: Session data:', {
      user: session?.user,
      status,
      isAuthenticated: status === 'authenticated'
    });

    const userRole = session?.user?.role
    const userAllowedCompanies = session?.user?.allowedCompanies || []

    // Normalize company names from auth to match component names (lowercase to proper casing)
    const companyNameMap: Record<string, string> = {
      'avalern': 'Avalern',
      'craftycode': 'CraftyCode'
    }
    
    // Make sure to apply mapping to all company names
    const allowed = userAllowedCompanies.map(c => {
      // Ensure lowercase comparison for mapping
      const companyLower = typeof c === 'string' ? c.toLowerCase() : '';
      return companyNameMap[companyLower] || c;
    });
    
    setAvailableCompanies(allowed);

    // Debug logging
    console.log('CompanyContext Debug:', {
      userRole,
      userAllowedCompanies,
      allowedAfterMapping: allowed,
      sessionStatus: status
    });

    if (userRole === 'member') {
      // For 'member', force 'Avalern' and lock it.
      const fixedCompany = 'Avalern';
      console.log('Setting fixed company for member:', fixedCompany);
      setSelectedCompanyState(fixedCompany);
      localStorage.setItem('selectedCompany', fixedCompany);
    } else {
      // For 'admin' or other roles, use localStorage or default.
      const savedCompany = localStorage.getItem('selectedCompany')
      console.log('Admin user - saved company from localStorage:', savedCompany);
      
      if (savedCompany && allowed.includes(savedCompany)) {
        setSelectedCompanyState(savedCompany)
      } else {
        // Default to Avalern if available, otherwise first available company
        const defaultCompany = allowed.includes('Avalern') ? 'Avalern' : (allowed[0] || '');
        console.log('Setting default company:', defaultCompany);
        setSelectedCompanyState(defaultCompany)
        if(defaultCompany) localStorage.setItem('selectedCompany', defaultCompany)
      }
    }
    
    setIsLoading(false)
  }, [status, session])

  const setSelectedCompany = (company: string) => {
    // Only allow changing company if the user is not a 'member'
    if (session?.user?.role !== 'member' && availableCompanies.includes(company)) {
      setSelectedCompanyState(company)
      localStorage.setItem('selectedCompany', company)
    }
  }

  const value = {
    selectedCompany,
    setSelectedCompany,
    isLoading: isLoading || status === 'loading',
    availableCompanies: session?.user?.role === 'member' ? [] : availableCompanies,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
} 