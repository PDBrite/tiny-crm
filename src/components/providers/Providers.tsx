'use client'

import { CompanyProvider } from '@/contexts/CompanyContext'
import AuthProvider from './AuthProvider'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CompanyProvider>
        {children}
      </CompanyProvider>
    </AuthProvider>
  )
} 