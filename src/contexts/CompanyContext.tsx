'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CompanyContextType {
  selectedCompany: string
  setSelectedCompany: (company: string) => void
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string>('CraftyCode')
  const [isLoading, setIsLoading] = useState(true)

  // Load company from localStorage on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem('selectedCompany')
    if (savedCompany && (savedCompany === 'CraftyCode' || savedCompany === 'Avalern')) {
      setSelectedCompanyState(savedCompany)
    }
    setIsLoading(false)
  }, [])

  // Save to localStorage when company changes
  const setSelectedCompany = (company: string) => {
    setSelectedCompanyState(company)
    localStorage.setItem('selectedCompany', company)
  }

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, isLoading }}>
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