/**
 * app/(auth)/signup/page.tsx
 * Account creation for pre-approved members.
 */
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, AlertBanner } from '@/components/ui'
import { Eye, EyeOff, UserPlus, Wallet, CheckCircle } from 'lucide-react'

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [contractAccepted, setContractAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (!contractAccepted) { setError('You must accept the membership contract.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const result = await signup({ name: form.name, email: form.email, password: form.password, phone: form.phone })
    if (result.success) {
      router.replace('/pending')
    } else {
      setError(result.error || 'Signup failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-emerald-500 -top-48 -right-48" />

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Wallet size={24} className="text-emerald-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">Your account will be pending admin approval</p>
        </div>

        <div className="card p-8">
          {error && <div className="mb-5"><AlertBanner variant="error">{error}</AlertBanner></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="John Doe" required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} />
            </div>
            <div>
              <label className="label">Phone Number (WhatsApp)</label>
              <input type="tel" className="input" placeholder="+234 800 000 0000" required value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword?'text':'password'} className="input pr-12" placeholder="Min. 6 characters" required value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} />
                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" placeholder="Repeat password" required value={form.confirm} onChange={e=>setForm(p=>({...p,confirm:e.target.value}))} />
            </div>

            {/* Contract */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <h3 className="text-sm font-semibold text-white">Membership Contract Summary</h3>
              <ul className="text-xs text-white/40 space-y-1.5">
                {[
                  'Monthly contributions are fixed and mandatory',
                  'Months must be paid in order — no skipping',
                  'A 7.5% exit fee applies to all withdrawals',
                  'Ownership shares are recalculated with each member change',
                  'All financial data is private and confidential',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle size={12} className="text-emerald-500/50 mt-0.5 flex-shrink-0"/>
                    {t}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-3 cursor-pointer group mt-3">
                <div
                  onClick={() => setContractAccepted(!contractAccepted)}
                  className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all ${contractAccepted?'bg-emerald-500 border-emerald-500':'border-white/20 group-hover:border-emerald-500/50'}`}
                >
                  {contractAccepted && <CheckCircle size={12} className="text-white"/>}
                </div>
                <span className="text-sm text-white/60">I have read and agree to the membership contract and rules.</span>
              </label>
            </div>

            <button type="submit" disabled={loading||!contractAccepted} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading?<Spinner size={16}/>:<UserPlus size={16}/>}
              {loading?'Creating account...':'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6 pt-6 border-t border-white/[0.06]">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
