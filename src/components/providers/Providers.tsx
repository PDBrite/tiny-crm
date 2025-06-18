'use client'

import { CompanyProvider } from '@/contexts/CompanyContext'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <CompanyProvider>
      {children}
    </CompanyProvider>
  )
} 