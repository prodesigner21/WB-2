/**
 * app/(dashboard)/history/page.tsx
 * Full transaction history with filtering.
 */
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getUserPayments, getMemberMonths } from '@/lib/firestore'
import { formatCurrency, formatMonth } from '@/utils/calculations'
import { SectionHeader, paymentStatusBadge, Spinner, EmptyState, Badge } from '@/components/ui'
import { History, Filter, Calendar, CheckCircle } from 'lucide-react'
import type { Payment, MemberMonth } from '@/lib/types'

type FilterType = 'all' | 'approved' | 'pending' | 'rejected'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [memberMonths, setMemberMonths] = useState<MemberMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      getUserPayments(profile.id),
      getMemberMonths(profile.id),
    ]).then(([p, m]) => {
      setPayments(p)
      setMemberMonths(m)
    }).catch(e => {
      console.error('History load error:', e.message)
    }).finally(() => {
      setLoading(false)
    })
  }, [profile?.id])

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)

  const totalPaid = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Transaction History"
        subtitle="All your payment records and their current status."
      />

      {/* ── Summary stats ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid', value: formatCurrency(totalPaid), color: 'text-emerald-400' },
          { label: 'Pending', value: formatCurrency(totalPending), color: 'text-yellow-400' },
          { label: 'Transactions', value: payments.length.toString(), color: 'text-white' },
          { label: 'Paid Months', value: memberMonths.filter(m => m.status === 'paid').length.toString(), color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-display font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'approved', 'pending', 'rejected'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-white/40 hover:text-white border border-transparent'
            }`}
          >
            {f}
            {f !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                ({payments.filter(p => p.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Payment table ─────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<History size={24} />}
            title="No transactions found"
            description={filter !== 'all' ? `No ${filter} transactions` : 'Your payment history will appear here'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Months Covered</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Approved</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="text-white/40 text-xs whitespace-nowrap">
                      {p.createdAt?.toDate?.().toLocaleDateString('en-NG', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      }) || '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.monthsPaid.map(m => (
                          <span key={m} className="text-xs bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md text-white/60">
                            {formatMonth(m)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`font-semibold ${p.status === 'approved' ? 'text-emerald-400' : 'text-white'}`}>
                        {formatCurrency(p.amount)}
                      </span>
                    </td>
                    <td>
                      <code className="text-xs text-white/30 bg-white/[0.03] px-2 py-1 rounded">
                        {p.reference.slice(0, 20)}...
                      </code>
                    </td>
                    <td>{paymentStatusBadge(p.status)}</td>
                    <td className="text-xs text-white/30">
                      {p.approvedAt?.toDate?.().toLocaleDateString('en-NG') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Month breakdown ───────────────────────────── */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white mb-4">Month Breakdown</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {memberMonths.sort((a, b) => a.month.localeCompare(b.month)).map(m => (
            <div
              key={m.id}
              title={`${formatMonth(m.month)}: ${m.status}`}
              className={`
                p-2.5 rounded-xl border text-center text-[11px] font-semibold cursor-default
                ${m.status === 'paid'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : m.status === 'pending'
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/[0.06] border-red-500/10 text-red-400/50'}
              `}
            >
              <div className="text-[9px] opacity-50">{m.month.split('-')[0]}</div>
              <div>{new Date(`${m.month}-01`).toLocaleString('default', { month: 'short' })}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-white/40">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Paid</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-500" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/40" /> Unpaid</span>
        </div>
      </div>
    </div>
  )
}
