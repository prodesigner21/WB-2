/**
 * app/apply/page.tsx — FIXED VERSION
 * - Uses /api/apply (Admin SDK) instead of client Firestore → fixes infinite spinner
 * - Full field-level client + server validation
 * - Downloadable membership contract PDF
 */
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Send, Wallet, Download, FileText, AlertCircle } from 'lucide-react'
import { AlertBanner, Spinner } from '@/components/ui'
import axios from 'axios'

interface FormErrors { name?: string; email?: string; phone?: string; reason?: string; contract?: string }

export default function ApplyPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' })
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadingContract, setDownloadingContract] = useState(false)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Please enter your full name (min 2 characters).'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Please enter a valid email address.'
    if (!form.phone.trim() || form.phone.trim().replace(/\D/g,'').length < 7) e.phone = 'Please enter a valid phone number (e.g. +234 800 000 0000).'
    if (!form.reason.trim() || form.reason.trim().length < 20) e.reason = 'Please write at least 20 characters explaining your interest.'
    if (!accepted) e.contract = 'You must read and accept the membership contract to apply.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) { setErrors(clientErrors); return }
    setErrors({})
    setLoading(true)
    try {
      await axios.post('/api/apply', { ...form, email: form.email.trim().toLowerCase(), contractAccepted: true })
      setSubmitted(true)
    } catch (err: any) {
      if (err.response?.status === 422 && err.response?.data?.errors) setErrors(err.response.data.errors)
      else if (err.response?.status === 409) setErrors({ email: 'An application with this email already exists.' })
      else setServerError(err.response?.data?.error || 'Submission failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadContract() {
    setDownloadingContract(true)
    try {
      const { downloadMembershipContract } = await import('@/utils/contractGenerator')
      downloadMembershipContract()
    } catch { setServerError('Could not generate contract PDF.') }
    finally { setDownloadingContract(false) }
  }

  function clearError(field: keyof FormErrors) { setErrors(prev => { const n = { ...prev }; delete n[field]; return n }) }

  if (submitted) return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4">
      <div className="card p-10 max-w-md w-full text-center space-y-5 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-400"/>
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-white">Application Submitted!</h2>
          <p className="text-white/50 text-sm mt-2">
            Thank you, <strong className="text-white/80">{form.name}</strong>. Your application is pending admin review. You will be contacted once approved.
          </p>
        </div>
        <div className="text-left p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">What happens next</p>
          {['Admin reviews your application','You receive an approval notification','Create your account at /signup','Log in and start contributing'].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white/60">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center flex-shrink-0">{i+1}</span>
              {step}
            </div>
          ))}
        </div>
        <Link href="/signup" className="btn-primary block text-center">Create Your Account →</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-vault-950 bg-grid flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="glow-orb w-96 h-96 bg-emerald-500 -top-48 -left-48"/>
      <div className="w-full max-w-lg relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-4">
            <Wallet size={24} className="text-emerald-400"/>
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Apply for Membership</h1>
          <p className="text-white/40 text-sm mt-1">Private wealth-building collective — limited spots available</p>
        </div>

        <div className="card p-8 space-y-5">
          {serverError && <AlertBanner variant="error">{serverError}</AlertBanner>}

          {/* Contract download banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
            <FileText size={18} className="text-blue-400 flex-shrink-0 mt-0.5"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Read the Membership Contract First</p>
              <p className="text-xs text-white/40 mt-0.5">Download and review the full contract before applying. This is legally binding.</p>
            </div>
            <button type="button" onClick={handleDownloadContract} disabled={downloadingContract}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
              {downloadingContract ? <Spinner size={12}/> : <Download size={12}/>}
              Download PDF
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className={`input ${errors.name ? 'border-red-500/50' : ''}`} placeholder="John Doe"
                  value={form.name} onChange={e => { setForm(p => ({...p, name: e.target.value})); clearError('name') }}/>
                {errors.name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.name}</p>}
              </div>
              <div>
                <label className="label">WhatsApp Phone *</label>
                <input className={`input ${errors.phone ? 'border-red-500/50' : ''}`} placeholder="+234 800 000 0000"
                  value={form.phone} onChange={e => { setForm(p => ({...p, phone: e.target.value})); clearError('phone') }}/>
                {errors.phone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email Address *</label>
              <input type="email" className={`input ${errors.email ? 'border-red-500/50' : ''}`} placeholder="you@example.com"
                value={form.email} onChange={e => { setForm(p => ({...p, email: e.target.value})); clearError('email') }}/>
              {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.email}</p>}
            </div>

            <div>
              <label className="label">Why do you want to join? * <span className="text-white/20 font-normal">(min 20 chars)</span></label>
              <textarea className={`input resize-none ${errors.reason ? 'border-red-500/50' : ''}`} rows={4}
                placeholder="Tell us about your financial goals and why you'd be a great member..."
                value={form.reason} onChange={e => { setForm(p => ({...p, reason: e.target.value})); clearError('reason') }}/>
              <div className="flex items-start justify-between mt-1">
                {errors.reason ? <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={10}/>{errors.reason}</p> : <span/>}
                <span className={`text-xs ml-auto ${form.reason.length < 20 ? 'text-white/20' : 'text-emerald-400'}`}>{form.reason.length}/20</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${errors.contract ? 'bg-red-500/[0.04] border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
              <label className="flex items-start gap-3 cursor-pointer group" onClick={() => { setAccepted(!accepted); clearError('contract') }}>
                <div className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all ${accepted ? 'bg-emerald-500 border-emerald-500' : errors.contract ? 'border-red-500/50' : 'border-white/20 group-hover:border-white/40'}`}>
                  {accepted && <CheckCircle size={12} className="text-white"/>}
                </div>
                <span className="text-sm text-white/60 select-none">
                  I have{' '}
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDownloadContract() }} className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
                    downloaded and read the contract
                  </button>
                  . I understand monthly contributions are mandatory, a 7.5% exit fee applies, and all rules are binding.
                </span>
              </label>
              {errors.contract && <p className="text-red-400 text-xs mt-2 ml-8 flex items-center gap-1"><AlertCircle size={10}/>{errors.contract}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner size={16}/> : <Send size={16}/>}
              {loading ? 'Submitting application...' : 'Submit Application'}
            </button>
          </form>

          <div className="pt-2 border-t border-white/[0.06] text-center space-y-1">
            <p className="text-sm text-white/40">Already have an account? <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">Sign in</Link></p>
            <p className="text-xs text-white/20">After approval, create your account at <Link href="/signup" className="text-white/40 hover:text-white/60 underline">/signup</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
