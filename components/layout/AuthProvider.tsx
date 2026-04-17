/**
 * components/layout/AuthProvider.tsx
 * Bootstraps auth state. Must wrap all pages.
 */
'use client'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialized } = useAuth()
  // Auth state is initialized by useAuth's onAuthStateChanged listener
  return <>{children}</>
}
