/**
 * app/(dashboard)/layout.tsx
 * Wraps all authenticated pages with sidebar + guard.
 */
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageLoader } from '@/components/ui'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { initialized, isAuthenticated, isPending, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (isPending) {
      router.replace('/pending')
      return
    }
  }, [initialized, isAuthenticated, isPending])

  if (!initialized) return <PageLoader />
  if (!isAuthenticated || isPending) return null

  return (
    <div className="min-h-screen bg-vault-950 bg-grid">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen pt-14 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
