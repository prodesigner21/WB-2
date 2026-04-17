/**
 * app/setup/page.tsx
 * First-run admin setup wizard.
 * Step 1: Create account (or log in if already created)
 * Step 2: Claim admin role (only works if no admin exists yet)
 * Step 3: Log out → log back in → redirects to /admin
 *
 * After the first admin exists, this page shows a "locked" state.
 */
'use client'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/firebase'
import { Spinner, AlertBanner } from '@/components/ui'
import { Shield, CheckCircle, Lock, LogOut, ArrowRight, Wallet, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import axios from 'axios'

type Step = 'login' | 'claim' | 'done'

export default function SetupPage() {
  const { isAuthenticated, profile, logout, refreshProfile } = useAuth()
  const [step, setStep] = useState<Step>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function claimAdmin() {
    setLoading(true)
    setError('')
    try {
      const token = await auth.currentUser?.getIdToken()
      await axios.post('/api/setup-admin', {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSuccess(true)
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to claim admin role.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoutAndRedirect() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-emerald-500 -top-32 -right-32 opacity-10" />

      <div className="w-full max-w-md relative animate-slide-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-4">
            <Shield size={26} className="text-emerald-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Admin Setup</h1>
          <p className="text-white/40 text-sm mt-1">First-time platform configuration</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[
            { num: 1, label: 'Create Account' },
            { num: 2, label: 'Claim Admin' },
            { num: 3, label: 'Log Back In' },
          ].map((s, i) => {
            const done = (s.num === 1 && isAuthenticated) || (s.num <= 2 && success)
            const active = (s.num === 1 && !isAuthenticated) || (s.num === 2 && isAuthenticated && !success) || (s.num === 3 && success)
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  done ? 'bg-emerald-500 border-emerald-500 text-white' :
                  active ? 'border-emerald-500/60 text-emerald-400' :
                  'border-white/10 text-white/20'
                }`}>
                  {done ? <CheckCircle size={14} /> : s.num}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-white/70' : done ? 'text-emerald-400' : 'text-white/20'}`}>
                  {s.label}
                </span>
                {i < 2 && <div className="w-6 h-px bg-white/10 mx-1" />}
              </div>
            )
          })}
        </div>

        <div className="card p-8 space-y-5">

          {/* ── STEP 1: Not logged in ─────────────────────────────── */}
          {!isAuthenticated && (
            <>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/[0.06] border border-yellow-500/15">
                <Lock size={16} className="text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-300/80">
                  You need to create an account first, then come back here to claim admin.
                </p>
              </div>
              <div className="space-y-3">
                <Link href="/signup" className="btn-primary w-full flex items-center justify-center gap-2">
                  Create Account First <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="btn-secondary w-full flex items-center justify-center gap-2">
                  Already have an account? Log In
                </Link>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-white/30 text-center">
                  After creating your account, return to this page at <code className="text-white/50">/setup</code>
                </p>
              </div>
            </>
          )}

          {/* ── STEP 2: Logged in, not yet admin ─────────────────── */}
          {isAuthenticated && !success && (
            <>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-white/30 mb-1">Logged in as</p>
                <p className="font-semibold text-white">{profile?.name || auth.currentUser?.email}</p>
                <p className="text-sm text-white/40">{profile?.email}</p>
                <p className="text-xs mt-2">
                  Current role:{' '}
                  <span className="text-yellow-400 font-semibold capitalize">{profile?.role || 'loading...'}</span>
                </p>
              </div>

              {error && <AlertBanner variant="error">{error}</AlertBanner>}

              <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 space-y-2 text-sm">
                <p className="font-semibold text-white flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400" /> What this does:
                </p>
                <ul className="text-white/50 space-y-1 text-xs ml-5 list-disc">
                  <li>Sets your role to <strong className="text-white/70">admin</strong></li>
                  <li>Sets your account to <strong className="text-white/70">active</strong></li>
                  <li>Sets your share to <strong className="text-white/70">100%</strong> (adjusts as members join)</li>
                  <li>Only works <strong className="text-white/70">once</strong> — locked after first admin exists</li>
                </ul>
              </div>

              <button onClick={claimAdmin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Spinner size={16} /> : <Shield size={16} />}
                {loading ? 'Claiming admin role...' : 'Claim Admin Role'}
              </button>

              <button onClick={handleLogoutAndRedirect} className="w-full flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors py-2">
                <LogOut size={14} /> Sign out and use a different account
              </button>
            </>
          )}

          {/* ── STEP 3: Success — must log out & back in ──────────── */}
          {success && (
            <>
              <div className="text-center space-y-4 py-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Admin role granted!</h3>
                  <p className="text-white/40 text-sm mt-1">
                    You must log out and log back in for the changes to take effect.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/[0.06] border border-yellow-500/15 text-sm text-yellow-300/80">
                <strong>Important:</strong> Zustand caches your old role in memory. Logging out fully clears it and your next login will load the admin role fresh from Firestore.
              </div>

              <button
                onClick={handleLogoutAndRedirect}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Log Out → Log Back In as Admin
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          This page is only accessible during first-time setup. Once an admin exists it becomes locked.
        </p>
      </div>
    </div>
  )
}
