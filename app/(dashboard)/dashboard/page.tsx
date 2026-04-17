/**
 * app/(dashboard)/dashboard/page.tsx
 * Member + Admin dashboard with live stats, charts, and alerts.
 */
'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency, formatCurrencyCompact, formatMonth } from '@/utils/calculations'
import {
  StatCard, Badge, paymentStatusBadge, Spinner, AlertBanner,
  SectionHeader, EmptyState, ProgressBar
} from '@/components/ui'
import {
  Wallet, TrendingUp, Users, AlertCircle, Clock, CheckCircle,
  ArrowUpRight, DollarSign, BarChart2, Activity
} from 'lucide-react'
import Link from 'next/link'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Filler
)

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()
  const { summary, loading } = useDashboard(profile?.id || '', profile?.sharePercent || 0)

  if (!profile) return null

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Welcome back, {profile.name.split(' ')[0]}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin" className="btn-secondary text-xs px-4 py-2 flex items-center gap-2">
            <Users size={14} />
            Admin Panel
          </Link>
        )}
      </div>

      {/* ── Unpaid Months Alert ──────────────────────────── */}
      {summary && summary.unpaidMonths.length > 0 && (
        <AlertBanner variant="warning">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>
            You have <strong>{summary.unpaidMonths.length} unpaid month{summary.unpaidMonths.length > 1 ? 's' : ''}</strong>.
            {' '}Oldest due: <strong>{formatMonth(summary.unpaidMonths[0].month)}</strong>.{' '}
            <Link href="/pay" className="underline underline-offset-2 hover:text-yellow-200">Pay now →</Link>
          </span>
        </AlertBanner>
      )}

      {/* ── Stat Cards ───────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Net Balance"
            value={formatCurrencyCompact(summary.netBalance)}
            sub="Contributions + Income − Withdrawals"
            icon={<Wallet size={16} />}
            accent="emerald"
          />
          <StatCard
            label="Total Contributions"
            value={formatCurrencyCompact(summary.totalContributions)}
            sub="All members combined"
            icon={<DollarSign size={16} />}
            accent="gold"
          />
          <StatCard
            label="Total Income"
            value={formatCurrencyCompact(summary.totalIncome)}
            sub="Revenue generated"
            icon={<TrendingUp size={16} />}
            accent="blue"
          />
          <StatCard
            label="Your Share"
            value={`${summary.userSharePercent.toFixed(2)}%`}
            sub={`≈ ${formatCurrencyCompact(summary.userProfitShare)} profit share`}
            icon={<BarChart2 size={16} />}
            accent="emerald"
          />
        </div>
      ) : null}

      {/* ── Member Personal Summary + Month Status ───────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Personal contributions card */}
        <div className="card p-6 space-y-4">
          <h3 className="font-display font-semibold text-base text-white">Your Contributions</h3>
          {summary ? (
            <>
              <div className="text-3xl font-display font-bold text-emerald-400">
                {formatCurrency(summary.userContributionTotal)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Paid months</span>
                  <span className="text-emerald-400 font-semibold">{summary.paidMonths.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Pending approval</span>
                  <span className="text-yellow-400 font-semibold">{summary.pendingMonths.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Unpaid months</span>
                  <span className="text-red-400 font-semibold">{summary.unpaidMonths.length}</span>
                </div>
              </div>
              {summary.nextPaymentDue && (
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-yellow-400" />
                    <span className="text-white/40">Next due:</span>
                    <span className="text-yellow-400 font-semibold">{formatMonth(summary.nextPaymentDue)}</span>
                  </div>
                  <Link href="/pay" className="btn-primary w-full text-center text-sm mt-3 block">
                    Pay Now
                  </Link>
                </div>
              )}
            </>
          ) : <Spinner />}
        </div>

        {/* Month status grid */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-base text-white mb-4">Month Status</h3>
          {summary ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
              {[...summary.paidMonths, ...summary.pendingMonths, ...summary.unpaidMonths]
                .sort((a, b) => a.month.localeCompare(b.month))
                .map(m => (
                  <div
                    key={m.id}
                    className={`
                      flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] font-semibold
                      ${m.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        m.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                        'bg-red-500/[0.06] border-red-500/10 text-red-400/60'}
                    `}
                  >
                    <span className="text-[9px] opacity-60">{m.month.split('-')[0]}</span>
                    <span>{new Date(`${m.month}-01`).toLocaleString('default', { month: 'short' })}</span>
                    {m.status === 'paid' && <CheckCircle size={10} className="mt-0.5" />}
                  </div>
                ))}
            </div>
          ) : <Spinner />}
        </div>
      </div>

      {/* ── Recent Transactions ──────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="font-display font-semibold text-base text-white">Recent Transactions</h3>
          <Link href="/history" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        {summary?.recentPayments && summary.recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Months</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentPayments.map(p => (
                  <tr key={p.id}>
                    <td className="text-white/40 text-xs">
                      {p.createdAt?.toDate?.().toLocaleDateString('en-NG') || '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.monthsPaid.slice(0, 3).map(m => (
                          <span key={m} className="text-xs bg-white/[0.04] px-2 py-0.5 rounded text-white/60">
                            {formatMonth(m)}
                          </span>
                        ))}
                        {p.monthsPaid.length > 3 && (
                          <span className="text-xs text-white/30">+{p.monthsPaid.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                    <td className="font-mono text-xs text-white/30">{p.reference.slice(0, 14)}...</td>
                    <td>{paymentStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Activity size={24} />}
            title="No transactions yet"
            description="Your payment history will appear here"
          />
        )}
      </div>
    </div>
  )
}
