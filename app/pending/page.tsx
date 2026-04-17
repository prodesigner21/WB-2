// app/pending/page.tsx
'use client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Clock, Wallet, LogOut } from 'lucide-react'

export default function PendingPage() {
  const { profile, logout, isAuthenticated, initialized, isMember, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!initialized) return
    if (!isAuthenticated) router.replace('/login')
    if (isMember) router.replace('/dashboard')
    if (isAdmin) router.replace('/admin')
  }, [initialized, isAuthenticated, isMember, isAdmin])

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-gold-500 top-0 right-0 opacity-10" />
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="card p-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock size={28} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white mb-2">Application Pending</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Hi <span className="text-white font-semibold">{profile?.name || 'there'}</span>, your account is being reviewed by an admin.
              You'll receive an email notification once approved.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left space-y-2 text-sm">
            <p className="text-white/60"><span className="text-white/30">Email: </span>{profile?.email}</p>
            <p className="text-white/60"><span className="text-white/30">Phone: </span>{profile?.phone}</p>
            <p className="text-white/60"><span className="text-white/30">Status: </span><span className="text-yellow-400">Pending approval</span></p>
          </div>
          <button onClick={logout} className="btn-secondary w-full flex items-center justify-center gap-2">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
