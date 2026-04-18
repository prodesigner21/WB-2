/**
 * app/(dashboard)/statement/page.tsx
 * Financial statement page with PDF download.
 */
'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getUserPayments, getUserContributions, getMemberMonths,
  getTotalContributions, getTotalIncome, getTotalWithdrawals
} from '@/lib/firestore'
import {
  formatCurrency, calculateNetBalance, calculateProfitShare,
  sumUserContributions, formatMonth
} from '@/utils/calculations'
import { SectionHeader, StatCard, paymentStatusBadge, Spinner } from '@/components/ui'
import { FileText, Download, TrendingUp, DollarSign, Percent, PieChart } from 'lucide-react'
import type { Payment, Contribution, MemberMonth } from '@/lib/types'
import toast from 'react-hot-toast'

export default function StatementPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [data, setData] = useState<{
    payments: Payment[]
    contributions: Contribution[]
    memberMonths: MemberMonth[]
    totalContributions: number
    totalIncome: number
    totalWithdrawals: number
    userTotal: number
    profitShare: number
    netBalance: number
  } | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      getUserPayments(profile.id),
      getUserContributions(profile.id),
      getMemberMonths(profile.id),
      getTotalContributions(),
      getTotalIncome(),
      getTotalWithdrawals(),
    ]).then(([payments, contributions, memberMonths, totalContributions, totalIncome, totalWithdrawals]) => {
      setData({
        payments,
        contributions,
        memberMonths,
        totalContributions,
        totalIncome,
        totalWithdrawals,
        userTotal: sumUserContributions(contributions),
        profitShare: calculateProfitShare(totalIncome, profile.sharePercent),
        netBalance: calculateNetBalance(totalContributions, totalIncome, totalWithdrawals),
      })
    }).catch(e => {
      console.error('Statement load error:', e.message)
    }).finally(() => {
      setLoading(false)
    })
  }, [profile?.id])

  async function downloadPDF() {
    if (!profile || !data) return
    setGenerating(true)
    try {
      const { generateFinancialStatement } = await import('@/utils/pdfGenerator')
      await generateFinancialStatement({
        user: profile,
        contributions: data.contributions,
        payments: data.payments,
        memberMonths: data.memberMonths,
        totalContributions: data.userTotal,
        profitShare: data.profitShare,
        netBalance: data.netBalance,
      })
      toast.success('Statement downloaded successfully!')
    } catch (err) {
      toast.error('Failed to generate PDF.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size={32} /></div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <SectionHeader
        title="Financial Statement"
        subtitle={`Statement as of ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        action={
          <button onClick={downloadPDF} disabled={generating} className="btn-primary flex items-center gap-2">
            {generating ? <Spinner size={16} /> : <Download size={16} />}
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        }
      />

      {/* Member info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-xl font-bold text-emerald-400">
              {profile?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-white">{profile?.name}</h2>
            <p className="text-sm text-white/40">{profile?.email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-white/30">Member since</p>
            <p className="text-sm font-semibold text-white">{formatMonth(profile?.joinedMonth || '')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-xs text-white/30 mb-1">Your Contributions</p>
            <p className="font-bold text-emerald-400">{formatCurrency(data?.userTotal || 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-xs text-white/30 mb-1">Profit Share</p>
            <p className="font-bold text-gold-400">{formatCurrency(data?.profitShare || 0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-xs text-white/30 mb-1">Ownership</p>
            <p className="font-bold text-white">{profile?.sharePercent.toFixed(2)}%</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <p className="text-xs text-white/30 mb-1">Total Value</p>
            <p className="font-bold text-emerald-400">
              {formatCurrency((data?.userTotal || 0) + (data?.profitShare || 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Fund overview */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white mb-4">Fund Overview</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2.5 border-b border-white/[0.04]">
            <span className="text-white/50">Total Member Contributions</span>
            <span className="text-white font-semibold">{formatCurrency(data?.totalContributions || 0)}</span>
          </div>
          <div className="flex justify-between py-2.5 border-b border-white/[0.04]">
            <span className="text-white/50">Total Income Earned</span>
            <span className="text-emerald-400 font-semibold">+ {formatCurrency(data?.totalIncome || 0)}</span>
          </div>
          <div className="flex justify-between py-2.5 border-b border-white/[0.04]">
            <span className="text-white/50">Total Withdrawals</span>
            <span className="text-red-400 font-semibold">− {formatCurrency(data?.totalWithdrawals || 0)}</span>
          </div>
          <div className="flex justify-between py-2.5 font-bold text-lg">
            <span className="text-white">Net Balance</span>
            <span className="text-emerald-400">{formatCurrency(data?.netBalance || 0)}</span>
          </div>
        </div>
      </div>

      {/* Month status */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white mb-4">Monthly Status</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {data?.memberMonths.sort((a, b) => a.month.localeCompare(b.month)).map(m => (
            <div key={m.id} className={`
              text-center p-2 rounded-lg border text-[10px] font-semibold
              ${m.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                m.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-red-500/[0.05] border-red-500/10 text-red-400/50'}
            `}>
              <div className="text-[9px] opacity-50">{m.month.split('-')[0]}</div>
              {new Date(`${m.month}-01`).toLocaleString('default', { month: 'short' })}
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-white/[0.06]">
          <h3 className="font-display font-semibold text-white">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Months</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.payments.map(p => (
                <tr key={p.id}>
                  <td className="text-xs text-white/40 whitespace-nowrap">
                    {p.createdAt?.toDate?.().toLocaleDateString('en-NG') || '—'}
                  </td>
                  <td className="text-xs text-white/60">{p.monthsPaid.map(formatMonth).join(', ')}</td>
                  <td className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                  <td>{paymentStatusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-white/20 pb-4">
        This statement is confidential and intended solely for the named member.
        Generated {new Date().toLocaleString()}
      </p>
    </div>
  )
}
