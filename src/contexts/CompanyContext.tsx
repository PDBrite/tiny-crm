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
      return;
    }

    if (status === 'unauthenticated') {
      setIsLoading(false)
      return;
    }

    const userRole = session?.user?.role
    const userAllowedCompanies = session?.user?.allowedCompanies || []

    // Normalize company names from auth to match component names (lowercase to PascalCase)
    const allowed = userAllowedCompanies.map(c => c.charAt(0).toUpperCase() + c.slice(1))
    setAvailableCompanies(allowed);

    if (userRole === 'member') {
      // For 'member', force 'Avalern' and lock it.
      const fixedCompany = 'Avalern';
      setSelectedCompanyState(fixedCompany);
      localStorage.setItem('selectedCompany', fixedCompany);
    } else {
      // For 'admin' or other roles, use localStorage or default.
      const savedCompany = localStorage.getItem('selectedCompany')
      if (savedCompany && allowed.includes(savedCompany)) {
        setSelectedCompanyState(savedCompany)
      } else {
        const defaultCompany = allowed[0] || '';
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