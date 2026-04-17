/**
 * app/(dashboard)/exit/page.tsx
 * Member exit request with calculated payout preview.
 */
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getUserContributions, getExitRequests, getTotalIncome
} from '@/lib/firestore'
import {
  formatCurrency, calculateExitPayout, calculateProfitShare, sumUserContributions
} from '@/utils/calculations'
import { SectionHeader, AlertBanner, Badge, Spinner } from '@/components/ui'
import { DoorOpen, AlertTriangle, CheckCircle, Clock, Calculator } from 'lucide-react'
import { auth } from '@/lib/firebase'
import axios from 'axios'
import toast from 'react-hot-toast'
import type { ExitRequest } from '@/lib/types'

export default function ExitPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [existingRequest, setExistingRequest] = useState<ExitRequest | null>(null)
  const [preview, setPreview] = useState<{
    totalContributions: number
    profitShare: number
    exitFee: number
    finalPayout: number
  } | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      getUserContributions(profile.id),
      getExitRequests(),
      getTotalIncome(),
    ]).then(([contributions, exits, totalIncome]) => {
      const userTotal = sumUserContributions(contributions)
      const profitShare = calculateProfitShare(totalIncome, profile.sharePercent)
      const { exitFee, netPayout } = calculateExitPayout(userTotal, profitShare)

      setPreview({
        totalContributions: userTotal,
        profitShare,
        exitFee,
        finalPayout: netPayout,
      })

      const myExit = exits.find(e => e.userId === profile.id && e.status === 'pending')
      setExistingRequest(myExit || null)
      setLoading(false)
    })
  }, [profile?.id])

  async function handleSubmit() {
    if (!profile || !reason.trim() || !confirmed) return
    setSubmitting(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      await axios.post('/api/exit', {
        action: 'submit',
        userId: profile.id,
        reason,
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Exit request submitted. Awaiting admin review.')
      const exits = await getExitRequests()
      const myExit = exits.find(e => e.userId === profile.id && e.status === 'pending')
      setExistingRequest(myExit || null)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit exit request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <SectionHeader
        title="Request Exit"
        subtitle="Calculate your exit payout and submit a withdrawal request."
      />

      {/* ── Existing request ─────────────────────────── */}
      {existingRequest && (
        <div className="card p-6 border border-yellow-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-yellow-400" />
            <h3 className="font-display font-semibold text-white">Exit Request Pending</h3>
            <Badge variant="yellow">Pending Review</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Contributions</span>
              <span className="text-white">{formatCurrency(existingRequest.totalContributions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Profit Share</span>
              <span className="text-white">{formatCurrency(existingRequest.profitShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Exit Fee (7.5%)</span>
              <span className="text-red-400">− {formatCurrency(existingRequest.exitFee)}</span>
            </div>
            <div className="flex justify-between border-t border-white/[0.06] pt-2 font-bold">
              <span className="text-white">Final Payout</span>
              <span className="text-emerald-400 text-lg">{formatCurrency(existingRequest.finalPayout)}</span>
            </div>
          </div>
          <p className="text-xs text-white/30 mt-4">
            Submitted on {existingRequest.createdAt?.toDate?.().toLocaleDateString('en-NG')}
          </p>
        </div>
      )}

      {!existingRequest && (
        <>
          {/* ── Warning ──────────────────────────────── */}
          <AlertBanner variant="warning">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>
              Exiting the fund is <strong>permanent</strong>. You will lose your ownership share.
              A 7.5% exit fee is deducted from your total payout.
            </span>
          </AlertBanner>

          {/* ── Payout preview ───────────────────────── */}
          {preview && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator size={18} className="text-emerald-400" />
                <h3 className="font-display font-semibold text-white">Estimated Payout</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-white/50">Your total contributions</span>
                  <span className="text-white font-semibold">{formatCurrency(preview.totalContributions)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-white/50">Profit share ({profile?.sharePercent.toFixed(2)}%)</span>
                  <span className="text-emerald-400 font-semibold">+ {formatCurrency(preview.profitShare)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-white/50">Subtotal</span>
                  <span className="text-white">{formatCurrency(preview.totalContributions + preview.profitShare)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-white/50">Exit fee (7.5%)</span>
                  <span className="text-red-400 font-semibold">− {formatCurrency(preview.exitFee)}</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-500/5 px-4 rounded-xl">
                  <span className="font-bold text-white text-base">Final Payout</span>
                  <span className="font-bold text-2xl text-emerald-400">{formatCurrency(preview.finalPayout)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Exit form ────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <h3 className="font-display font-semibold text-white">Exit Request Form</h3>

            <div>
              <label className="label">Reason for exiting (required)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain your reason for requesting to exit the fund..."
                rows={4}
                className="input resize-none"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setConfirmed(!confirmed)}
                className={`
                  flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all
                  ${confirmed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-white/20 group-hover:border-emerald-500/50'}
                `}
              >
                {confirmed && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-white/60">
                I understand that exiting is <strong className="text-white/80">permanent</strong>,
                I will lose my ownership share, and a 7.5% exit fee will be deducted from my payout.
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim() || !confirmed || preview?.totalContributions === 0}
              className="btn-danger w-full flex items-center justify-center gap-2"
            >
              {submitting ? <Spinner size={16} /> : <DoorOpen size={16} />}
              {submitting ? 'Submitting...' : 'Submit Exit Request'}
            </button>

            {preview?.totalContributions === 0 && (
              <p className="text-xs text-center text-white/30">
                You have no approved contributions on record. Contact admin if this is an error.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
