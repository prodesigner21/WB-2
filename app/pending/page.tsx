/**
 * app/pending/page.tsx — FIXED
 * 
 * Now includes:
 *  - Auto-redirect when profile loads with correct role (handles async profile loading)
 *  - "Fix My Account" button that calls /api/auth/fix-account
 *  - Shows Firebase Auth UID for debugging
 *  - Handles null profile gracefully
 */
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { auth } from '@/lib/firebase'
import { Clock, LogOut, Wrench, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Spinner, AlertBanner } from '@/components/ui'
import axios from 'axios'

export default function PendingPage() {
  const { profile, logout, isAuthenticated, initialized, isMember, isAdmin, refreshProfile } = useAuth()
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)
  const [fixError, setFixError] = useState('')
  const [showDiag, setShowDiag] = useState(false)

  // Redirect once profile loads with the right role
  useEffect(() => {
    if (!initialized) return
    if (!isAuthenticated) { window.location.href = '/login'; return }
    if (isAdmin) { window.location.href = '/admin'; return }
    if (isMember) { window.location.href = '/dashboard'; return }
  }, [initialized, isAuthenticated, isAdmin, isMember])

  // If profile is null after initializing — auto-run fix silently
  useEffect(() => {
    if (initialized && isAuthenticated && !profile) {
      handleFix(true) // silent fix attempt
    }
  }, [initialized, isAuthenticated, profile])

  async function handleFix(silent = false) {
    setFixing(true)
    setFixError('')
    if (!silent) setFixResult(null)
    try {
      const token = await auth.currentUser?.getIdToken(true) // force refresh token
      const res = await axios.post('/api/auth/fix-account', {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setFixResult(res.data)

      // Refresh the profile from Firestore after fix
      await refreshProfile()

      // Now redirect based on fixed role
      const role = res.data.profile?.role
      if (role === 'admin') {
        setTimeout(() => { window.location.href = '/admin' }, 1500)
      } else if (role === 'member') {
        setTimeout(() => { window.location.href = '/dashboard' }, 1500)
      }
    } catch (err: any) {
      if (!silent) setFixError(err.response?.data?.error || 'Fix failed. Please try again.')
    } finally {
      setFixing(false)
    }
  }

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  const uid = auth.currentUser?.uid
  const email = auth.currentUser?.email

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-gold-500 top-0 right-0 opacity-10"/>

      <div className="w-full max-w-md text-center animate-slide-up space-y-4">

        <div className="card p-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <Clock size={28} className="text-yellow-400"/>
          </div>

          <div>
            <h1 className="font-display font-bold text-2xl text-white mb-2">Application Pending</h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Hi <span className="text-white font-semibold">{profile?.name || email?.split('@')[0] || 'there'}</span>,
              your account is pending admin review.
            </p>
          </div>

          {/* Profile info */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left space-y-2 text-sm">
            <p className="text-white/60">
              <span className="text-white/30">Email: </span>
              {profile?.email || email || <span className="text-red-400/60 italic">not loaded</span>}
            </p>
            <p className="text-white/60">
              <span className="text-white/30">Phone: </span>
              {profile?.phone || <span className="text-white/20 italic">—</span>}
            </p>
            <p className="text-white/60">
              <span className="text-white/30">Status: </span>
              <span className="text-yellow-400">
                {profile ? 'Pending approval' : 'Profile not loaded'}
              </span>
            </p>
          </div>

          {/* Fix result */}
          {fixResult && (
            <div className={`p-4 rounded-xl border text-left text-sm space-y-2 ${
              fixResult.profile?.role === 'admin' || fixResult.profile?.role === 'member'
                ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
              {fixResult.profile?.role === 'admin' ? (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle size={16}/> Admin role confirmed — redirecting...
                </div>
              ) : fixResult.profile?.role === 'member' ? (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle size={16}/> Member account confirmed — redirecting...
                </div>
              ) : (
                <p className="text-white/60">
                  Account checked. Role: <span className="text-yellow-400 font-semibold">{fixResult.profile?.role}</span>
                  {fixResult.fixed && ' (profile was repaired)'}
                </p>
              )}

              {/* Diagnosis toggle */}
              <button
                onClick={() => setShowDiag(!showDiag)}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 mt-1"
              >
                {showDiag ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                {showDiag ? 'Hide' : 'Show'} diagnostic details
              </button>
              {showDiag && (
                <div className="mt-2 space-y-1">
                  {fixResult.diagnosis?.map((line: string, i: number) => (
                    <p key={i} className="text-xs font-mono text-white/40">{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {fixError && <AlertBanner variant="error">{fixError}</AlertBanner>}

          {/* Actions */}
          <div className="space-y-3">
            {!fixResult && (
              <button
                onClick={() => handleFix(false)}
                disabled={fixing}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {fixing ? <Spinner size={16}/> : <Wrench size={16}/>}
                {fixing ? 'Diagnosing account...' : 'Fix / Refresh My Account'}
              </button>
            )}

            {fixResult && (fixResult.profile?.role === 'pending' || fixResult.profile?.role === 'admin') && (
              <button
                onClick={() => handleFix(false)}
                disabled={fixing}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                {fixing ? <Spinner size={14}/> : <Wrench size={14}/>}
                Run again
              </button>
            )}

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/50 transition-colors py-2">
              <LogOut size={14}/> Sign Out
            </button>
          </div>
        </div>

        {/* UID debug panel */}
        <div className="card p-4 text-left">
          <p className="text-xs text-white/20 mb-2 uppercase tracking-wider">Debug info</p>
          <p className="text-xs font-mono text-white/30 break-all">
            <span className="text-white/20">UID: </span>{uid || 'not authenticated'}
          </p>
          <p className="text-xs font-mono text-white/30 mt-1">
            <span className="text-white/20">Auth email: </span>{email || '—'}
          </p>
          <p className="text-xs font-mono text-white/30 mt-1">
            <span className="text-white/20">Profile loaded: </span>
            <span className={profile ? 'text-emerald-400/60' : 'text-red-400/60'}>
              {profile ? `yes (role: ${profile.role})` : 'no'}
            </span>
          </p>
          <p className="text-xs text-white/20 mt-2">
            Verify UID matches your Firestore document ID in Firebase Console → Firestore → users
          </p>
        </div>
      </div>
    </div>
  )
}
