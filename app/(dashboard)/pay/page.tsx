/**
 * app/(dashboard)/pay/page.tsx
 * Member payment page — select months, initiate Paystack payment.
 */
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { usePayments } from '@/hooks/usePayments'
import { subscribeToMemberMonths } from '@/lib/firestore'
import { formatCurrency, formatMonth, getNextUnpaidMonths } from '@/utils/calculations'
import { SectionHeader, AlertBanner, Badge, Spinner, EmptyState } from '@/components/ui'
import { CreditCard, CheckCircle, AlertCircle, Calendar, ArrowRight, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { MemberMonth } from '@/lib/types'
import axios from 'axios'
import { auth } from '@/lib/firebase'

const MONTHLY_AMOUNT = parseInt(process.env.NEXT_PUBLIC_MONTHLY_CONTRIBUTION || '50000')

export default function PayPage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const verifyRef = searchParams.get('verify')

  const [memberMonths, setMemberMonths] = useState<MemberMonth[]>([])
  const [monthsLoading, setMonthsLoading] = useState(true)
  const [selectedCount, setSelectedCount] = useState(1)
  const [paying, setPaying] = useState(false)

  const unpaid = memberMonths.filter(m => m.status === 'unpaid').sort((a, b) => a.month.localeCompare(b.month))
  const pending = memberMonths.filter(m => m.status === 'pending').sort((a, b) => a.month.localeCompare(b.month))
  const paid = memberMonths.filter(m => m.status === 'paid').sort((a, b) => a.month.localeCompare(b.month))

  const selectedMonths = unpaid.slice(0, selectedCount).map(m => m.month)
  const totalAmount = selectedCount * MONTHLY_AMOUNT

  // ── Subscribe to member months — with 6s absolute timeout ──
  useEffect(() => {
    if (!profile?.id) {
      setMonthsLoading(false)
      return
    }

    // Hard deadline — never spin longer than 6 seconds
    const deadline = setTimeout(() => setMonthsLoading(false), 6000)

    const unsub = subscribeToMemberMonths(
      profile.id,
      (months) => {
        clearTimeout(deadline)
        setMemberMonths(months)
        setMonthsLoading(false)
      },
      (err) => {
        clearTimeout(deadline)
        console.error('memberMonths error:', err.code, err.message)
        setMonthsLoading(false)
      }
    )
    return () => { clearTimeout(deadline); unsub() }
  }, [profile?.id])

  // ── Handle Paystack callback verification ─────────────
  useEffect(() => {
    if (!verifyRef || !profile?.id) return
    handleVerify(verifyRef)
  }, [verifyRef, profile?.id])

  async function handleVerify(reference: string) {
    try {
      const token = await auth.currentUser?.getIdToken()
      await axios.post('/api/payments/verify', {
        reference,
        userId: profile!.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Payment verified! Awaiting admin approval.')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed.')
    }
  }

  async function handlePay() {
    if (!profile || selectedMonths.length === 0) return
    setPaying(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const response = await axios.post('/api/payments/initiate', {
        userId: profile.id,
        months: selectedMonths,
        email: profile.email,
        userName: profile.name,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      window.location.href = response.data.paymentUrl
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Payment initiation failed.')
      setPaying(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <SectionHeader
        title="Make Payment"
        subtitle="Pay your monthly contributions. Oldest months are paid first."
      />

      {/* ── Verification success ──────────────────────── */}
      {verifyRef && (
        <AlertBanner variant="success">
          <CheckCircle size={16} className="flex-shrink-0" />
          Payment submitted successfully! An admin will review and approve it shortly.
        </AlertBanner>
      )}

      {/* ── Pending payments notice ───────────────────── */}
      {pending.length > 0 && (
        <AlertBanner variant="info">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            You have <strong>{pending.length}</strong> payment(s) pending admin approval:{' '}
            {pending.map(m => formatMonth(m.month)).join(', ')}
          </span>
        </AlertBanner>
      )}

      {monthsLoading ? (
        <div className="card p-8 flex items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : unpaid.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            icon={<CheckCircle size={24} className="text-emerald-400" />}
            title="All caught up!"
            description="You have no outstanding months to pay."
          />
        </div>
      ) : (
        <>
          {/* ── Month selector ──────────────────────── */}
          <div className="card p-6 space-y-6">
            <div>
              <h3 className="font-display font-semibold text-white mb-1">Select Months to Pay</h3>
              <p className="text-sm text-white/40">
                You must pay in order. {unpaid.length} month{unpaid.length > 1 ? 's' : ''} outstanding.
              </p>
            </div>

            {/* Month count slider */}
            <div className="space-y-3">
              <label className="label">Number of months</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={unpaid.length}
                  value={selectedCount}
                  onChange={(e) => setSelectedCount(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="w-8 text-center font-bold text-emerald-400 text-lg">{selectedCount}</span>
              </div>
            </div>

            {/* Selected months preview */}
            <div>
              <label className="label">Months being paid</label>
              <div className="flex flex-wrap gap-2">
                {selectedMonths.map(m => (
                  <span key={m} className="badge-green text-xs px-3 py-1.5">
                    <Calendar size={10} />
                    {formatMonth(m)}
                  </span>
                ))}
              </div>
            </div>

            {/* Rule reminder */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/[0.06] border border-yellow-500/10">
              <Lock size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/80">
                Months are paid in order only. You cannot skip months. The system auto-selects the oldest unpaid months.
              </p>
            </div>
          </div>

          {/* ── Payment summary ──────────────────────── */}
          <div className="card p-6 space-y-4">
            <h3 className="font-display font-semibold text-white">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Monthly contribution</span>
                <span className="text-white">{formatCurrency(MONTHLY_AMOUNT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Months selected</span>
                <span className="text-white">{selectedCount}</span>
              </div>
              <div className="border-t border-white/[0.06] pt-3 flex justify-between">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-xl text-emerald-400">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={paying || selectedMonths.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {paying ? (
                <><Spinner size={16} /> Processing...</>
              ) : (
                <><CreditCard size={16} /> Pay {formatCurrency(totalAmount)} via Paystack <ArrowRight size={16} /></>
              )}
            </button>
            <p className="text-center text-xs text-white/20">
              Secured by Paystack · Payment pending admin approval after completion
            </p>
          </div>
        </>
      )}

      {/* ── Paid months summary ─────────────────────── */}
      {paid.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-white mb-4">Paid Months</h3>
          <div className="flex flex-wrap gap-2">
            {paid.map(m => (
              <span key={m.id} className="badge-green text-xs">
                <CheckCircle size={10} />
                {formatMonth(m.month)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
