/**
 * app/(auth)/login/page.tsx — FIXED
 * Redirect uses the profile returned directly from login(), not useEffect.
 * This avoids the Zustand cache race condition.
 */
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, AlertBanner } from '@/components/ui'
import { Eye, EyeOff, LogIn, Wallet } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(form.email, form.password)

    if (!result.success) {
      setError(result.error || 'Login failed')
      setLoading(false)
      return
    }

    // Use profile returned directly from login() — avoids stale Zustand state
    const role = result.profile?.role
    if (role === 'admin') window.location.href = '/admin'
    else if (role === 'member') window.location.href = '/dashboard'
    else window.location.href = '/pending'
  }

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-emerald-500 -top-48 -left-48"/>
      <div className="glow-orb w-64 h-64 bg-blue-500 bottom-0 right-0"/>

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Wallet size={24} className="text-emerald-400"/>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Wealth Building LLC</h1>
          <p className="text-white/40 text-sm mt-1">Member Portal — Sign in to continue</p>
        </div>

        <div className="card p-8">
          <h2 className="font-display font-bold text-xl text-white mb-6">Welcome back</h2>

          {error && <div className="mb-5"><AlertBanner variant="error">{error}</AlertBanner></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" required autoComplete="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                  className="input pr-12" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <Spinner size={16}/> : <LogIn size={16}/>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] space-y-3 text-center text-sm">
            <p className="text-white/40">
              Not a member yet?{' '}
              <Link href="/apply" className="text-emerald-400 hover:text-emerald-300 font-medium">Apply for membership</Link>
            </p>
            <p className="text-white/40">
              New account?{' '}
              <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">Create account</Link>
            </p>
            <p className="text-white/30 text-xs">
              First time setup?{' '}
              <Link href="/setup" className="text-white/50 hover:text-white/70 underline">Admin setup →</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          © {new Date().getFullYear()} Wealth Building LLC. Confidential member platform.
        </p>
      </div>
    </div>
  )
}
