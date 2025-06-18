'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CompanyContextType {
  selectedCompany: string
  setSelectedCompany: (company: string) => void
  isLoading: boolean
  availableCompanies: string[]
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Both companies are available to all users
  const availableCompanies = ['CraftyCode', 'Avalern']

  // Load company from localStorage on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem('selectedCompany')
    
    // Check if saved company is valid
    if (savedCompany && availableCompanies.includes(savedCompany)) {
      setSelectedCompanyState(savedCompany)
    } else {
      // Default to first available company
      setSelectedCompanyState(availableCompanies[0])
      localStorage.setItem('selectedCompany', availableCompanies[0])
    }
    setIsLoading(false)
  }, [])

  // Save to localStorage when company changes
  const setSelectedCompany = (company: string) => {
    if (availableCompanies.includes(company)) {
      setSelectedCompanyState(company)
      localStorage.setItem('selectedCompany', company)
    }
  }

  return (
    <CompanyContext.Provider value={{ 
      selectedCompany, 
      setSelectedCompany, 
      isLoading,
      availableCompanies
    }}>
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