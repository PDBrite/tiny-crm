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
  // Always default to Avalern
  const [selectedCompany, setSelectedCompanyState] = useState<string>('Avalern')
  const [availableCompanies, setAvailableCompanies] = useState<string[]>(['Avalern'])
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

    // Force Avalern as the only company

    // Force Avalern as the only company
    setAvailableCompanies(['Avalern']);
    setSelectedCompanyState('Avalern');
    localStorage.setItem('selectedCompany', 'Avalern');
    
    setIsLoading(false)
  }, [status, session])

  // This function now does nothing since we're forcing Avalern
  const setSelectedCompany = (company: string) => {
    // Only allow Avalern
    if (company === 'Avalern') {
      setSelectedCompanyState('Avalern')
      localStorage.setItem('selectedCompany', 'Avalern')
    }
  }

  const value = {
    selectedCompany: 'Avalern',
    setSelectedCompany,
    isLoading: isLoading || status === 'loading',
    availableCompanies: ['Avalern'],
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