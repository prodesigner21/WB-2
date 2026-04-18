/**
 * app/admin/page.tsx
 * Full admin panel — payments, users, income, withdrawals, analytics, milestones.
 */
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  getAllPayments, getPendingUsers, getAllMembers,
  getAllIncome, getAllWithdrawals, getExitRequests, getMilestones
} from '@/lib/firestore'
import {
  formatCurrency, calculateNetBalance, formatMonth,
  calculateEqualShare, buildMonthlyInflow
} from '@/utils/calculations'
import {
  StatCard, Badge, paymentStatusBadge, Spinner, Modal,
  SectionHeader, AlertBanner, EmptyState, ProgressBar
} from '@/components/ui'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  Shield, Users, CreditCard, TrendingUp, ArrowDownLeft,
  CheckCircle, XCircle, Plus, BarChart2, MapPin,
  RefreshCw, Activity, DollarSign, Wallet, Clock, FlaskConical, Trash2
} from 'lucide-react'
import { auth } from '@/lib/firebase'
import axios from 'axios'
import toast from 'react-hot-toast'
import type { Payment, UserProfile, Income, Withdrawal, ExitRequest, Milestone } from '@/lib/types'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend, LineElement, PointElement, Filler
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, LineElement, PointElement, Filler)

type Tab = 'overview' | 'payments' | 'members' | 'income' | 'withdrawals' | 'milestones' | 'exits' | 'testdata'

export default function AdminPage() {
  const { profile, isAdmin, initialized } = useAuth()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('overview')
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers] = useState<UserProfile[]>([])
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [exits, setExits] = useState<ExitRequest[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [incomeModal, setIncomeModal] = useState(false)
  const [withdrawalModal, setWithdrawalModal] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState(false)
  const [rejectModal, setRejectModal] = useState<{ paymentId: string } | null>(null)

  // Forms
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: '', description: '' })
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: '', type: 'other', reason: '', memberId: '' })
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', targetAmount: '', targetDate: '', order: '0' })
  const [milestoneProgress, setMilestoneProgress] = useState<Record<string, number>>({})
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [testDataLoading, setTestDataLoading] = useState(false)
  const [testDataResult, setTestDataResult] = useState<any>(null)

  useEffect(() => {
    if (initialized && !isAdmin) { router.replace('/dashboard'); return }
    if (!initialized || !isAdmin) return
    loadAll()
  }, [initialized, isAdmin])

  async function loadAll() {
    setLoading(true)
    try {
      const [p, m, pu, inc, w, ex, mil] = await Promise.all([
        getAllPayments(), getAllMembers(), getPendingUsers(),
        getAllIncome(), getAllWithdrawals(), getExitRequests(), getMilestones()
      ])
      setPayments(p); setMembers(m); setPendingUsers(pu)
      setIncome(inc); setWithdrawals(w); setExits(ex); setMilestones(mil)
      const progressMap: Record<string, number> = {}
      mil.forEach(ms => { progressMap[ms.id] = ms.progress })
      setMilestoneProgress(progressMap)
    } catch (e: any) { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  async function apiCall(endpoint: string, body: object) {
    const token = await auth.currentUser?.getIdToken()
    return axios.post(endpoint, body, { headers: { Authorization: `Bearer ${token}` } })
  }

  async function approvePayment(paymentId: string) {
    try {
      await apiCall('/api/payments/approve', { paymentId, action: 'approve' })
      toast.success('Payment approved!')
      loadAll()
    } catch { toast.error('Failed to approve payment') }
  }

  async function rejectPayment() {
    if (!rejectModal) return
    setSubmitting(true)
    try {
      await apiCall('/api/payments/approve', { paymentId: rejectModal.paymentId, action: 'reject', rejectionReason: rejectReason })
      toast.success('Payment rejected.')
      setRejectModal(null); setRejectReason(''); loadAll()
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  async function approveUser(userId: string) {
    try {
      await apiCall('/api/admin/users', { action: 'approve', targetUserId: userId })
      toast.success('Member approved!'); loadAll()
    } catch { toast.error('Failed') }
  }

  async function rejectUser(userId: string) {
    try {
      await apiCall('/api/admin/users', { action: 'reject', targetUserId: userId })
      toast.success('Application rejected.'); loadAll()
    } catch { toast.error('Failed') }
  }

  async function addIncome() {
    if (!incomeForm.source || !incomeForm.amount) return
    setSubmitting(true)
    try {
      await apiCall('/api/admin/income', incomeForm)
      toast.success('Income recorded!'); setIncomeModal(false)
      setIncomeForm({ source: '', amount: '', description: '' }); loadAll()
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  async function addWithdrawal() {
    if (!withdrawalForm.amount || !withdrawalForm.reason) return
    setSubmitting(true)
    try {
      await apiCall('/api/admin/withdrawals', withdrawalForm)
      toast.success('Withdrawal recorded!'); setWithdrawalModal(false)
      setWithdrawalForm({ amount: '', type: 'other', reason: '', memberId: '' }); loadAll()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
    finally { setSubmitting(false) }
  }

  async function addMilestone() {
    if (!milestoneForm.title || !milestoneForm.description) return
    setSubmitting(true)
    try {
      await apiCall('/api/admin/milestones', milestoneForm)
      toast.success('Milestone added!'); setMilestoneModal(false)
      setMilestoneForm({ title: '', description: '', targetAmount: '', targetDate: '', order: '0' }); loadAll()
    } catch { toast.error('Failed') }
    finally { setSubmitting(false) }
  }

  async function updateMilestoneProgress(milestoneId: string, progress: number) {
    try {
      const token = await auth.currentUser?.getIdToken()
      await axios.patch('/api/admin/milestones', { milestoneId, progress }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Progress updated!'); loadAll()
    } catch { toast.error('Failed') }
  }

  async function approveExit(exitId: string) {
    try {
      await apiCall('/api/exit', { action: 'approve', exitRequestId: exitId })
      toast.success('Exit approved!'); loadAll()
    } catch { toast.error('Failed') }
  }

  async function rejectExit(exitId: string) {
    try {
      await apiCall('/api/exit', { action: 'reject', exitRequestId: exitId, rejectionReason: 'Rejected by admin' })
      toast.success('Exit rejected.'); loadAll()
    } catch { toast.error('Failed') }
  }

  async function testDataAction(action: string) {
    if (action === 'wipe_all' || action === 'wipe') {
      if (!confirm(action === 'wipe_all'
        ? 'DELETE ALL data including test members? (your admin account kept)'
        : 'Wipe all transactional data? (user accounts kept)')) return
    }
    setTestDataLoading(true)
    setTestDataResult(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await axios.post('/api/admin/test-data', { action }, { headers: { Authorization: `Bearer \${token}` } })
      setTestDataResult(res.data)
      toast.success(action === 'seed' ? 'Test data seeded!' : 'Data wiped!')
      loadAll()
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed') }
    finally { setTestDataLoading(false) }
  }

  async function recalculateShares() {
    try {
      await apiCall('/api/admin/users', { action: 'recalculate_shares' })
      toast.success('Shares recalculated!'); loadAll()
    } catch { toast.error('Failed') }
  }

  // ── Computed stats ────────────────────────────────────────────
  const totalContributions = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0)
  const totalIncome = income.reduce((s, i) => s + i.amount, 0)
  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0)
  const netBalance = calculateNetBalance(totalContributions, totalIncome, totalWithdrawals)
  const pendingPayments = payments.filter(p => p.status === 'pending')
  const complianceRate = members.length > 0
    ? Math.round((members.filter(m => m.sharePercent > 0).length / members.length) * 100)
    : 0

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: BarChart2 },
    { id: 'payments' as Tab, label: `Payments ${pendingPayments.length > 0 ? `(${pendingPayments.length})` : ''}`, icon: CreditCard },
    { id: 'members' as Tab, label: `Members ${pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}`, icon: Users },
    { id: 'income' as Tab, label: 'Income', icon: TrendingUp },
    { id: 'withdrawals' as Tab, label: 'Withdrawals', icon: ArrowDownLeft },
    { id: 'milestones' as Tab, label: 'Milestones', icon: MapPin },
    { id: 'exits' as Tab, label: 'Exits', icon: Activity },
    { id: 'testdata' as Tab, label: '🧪 Test Data', icon: FlaskConical },
  ]

  if (!initialized || !isAdmin) return <div className="min-h-screen bg-vault-950 flex items-center justify-center"><Spinner size={32} /></div>

  return (
    <div className="min-h-screen bg-vault-950 bg-grid">
      <Sidebar />
      <div className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8 page-enter">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield size={20} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-white">Admin Panel</h1>
                <p className="text-white/40 text-sm">Full platform control</p>
              </div>
            </div>
            <button onClick={loadAll} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-vault-800 border border-white/[0.06] rounded-xl p-1 mb-8 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  tab === id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner size={32} /></div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ────────────────────────── */}
              {tab === 'overview' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Net Balance" value={formatCurrency(netBalance)} icon={<Wallet size={16}/>} accent="emerald" sub="Contributions + Income − Withdrawals" />
                    <StatCard label="Total Contributions" value={formatCurrency(totalContributions)} icon={<DollarSign size={16}/>} accent="gold" />
                    <StatCard label="Total Income" value={formatCurrency(totalIncome)} icon={<TrendingUp size={16}/>} accent="blue" />
                    <StatCard label="Total Withdrawals" value={formatCurrency(totalWithdrawals)} icon={<ArrowDownLeft size={16}/>} accent="red" />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Active Members" value={members.filter(m=>m.isActive).length.toString()} icon={<Users size={16}/>} accent="emerald" />
                    <StatCard label="Pending Applicants" value={pendingUsers.length.toString()} icon={<Clock size={16}/>} accent="gold" />
                    <StatCard label="Pending Payments" value={pendingPayments.length.toString()} icon={<CreditCard size={16}/>} accent="red" />
                    <StatCard label="Compliance Rate" value={`${complianceRate}%`} icon={<Activity size={16}/>} accent="blue" />
                  </div>

                  {pendingPayments.length > 0 && (
                    <AlertBanner variant="warning">
                      <CreditCard size={16} className="flex-shrink-0"/>
                      <span><strong>{pendingPayments.length}</strong> payment(s) awaiting your approval.</span>
                      <button onClick={() => setTab('payments')} className="ml-auto text-xs underline">Review →</button>
                    </AlertBanner>
                  )}
                  {pendingUsers.length > 0 && (
                    <AlertBanner variant="info">
                      <Users size={16} className="flex-shrink-0"/>
                      <span><strong>{pendingUsers.length}</strong> member application(s) pending approval.</span>
                      <button onClick={() => setTab('members')} className="ml-auto text-xs underline">Review →</button>
                    </AlertBanner>
                  )}
                </div>
              )}

              {/* ── PAYMENTS TAB ─────────────────────────── */}
              {tab === 'payments' && (
                <div className="space-y-6">
                  <SectionHeader title="Payment Approvals" subtitle={`${pendingPayments.length} pending`} />
                  <div className="card overflow-hidden">
                    {payments.length === 0 ? (
                      <EmptyState icon={<CreditCard size={24}/>} title="No payments yet" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Member</th><th>Months</th><th>Amount</th>
                              <th>Date</th><th>Status</th><th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map(p => (
                              <tr key={p.id}>
                                <td className="font-medium text-white">{p.userName}</td>
                                <td>
                                  <div className="flex flex-wrap gap-1">
                                    {p.monthsPaid.slice(0,3).map(m=>(
                                      <span key={m} className="text-xs bg-white/[0.04] px-2 py-0.5 rounded text-white/60">{formatMonth(m)}</span>
                                    ))}
                                    {p.monthsPaid.length > 3 && <span className="text-xs text-white/30">+{p.monthsPaid.length-3}</span>}
                                  </div>
                                </td>
                                <td className="font-semibold text-emerald-400">{formatCurrency(p.amount)}</td>
                                <td className="text-xs text-white/40 whitespace-nowrap">
                                  {p.createdAt?.toDate?.().toLocaleDateString('en-NG')||'—'}
                                </td>
                                <td>{paymentStatusBadge(p.status)}</td>
                                <td>
                                  {p.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <button onClick={() => approvePayment(p.id)}
                                        className="flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <CheckCircle size={12}/> Approve
                                      </button>
                                      <button onClick={() => setRejectModal({ paymentId: p.id })}
                                        className="flex items-center gap-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <XCircle size={12}/> Reject
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MEMBERS TAB ──────────────────────────── */}
              {tab === 'members' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Member Management"
                    action={
                      <button onClick={recalculateShares} className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
                        <RefreshCw size={14}/> Recalculate Shares
                      </button>
                    }
                  />

                  {pendingUsers.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-yellow-400"/> Pending Applications
                      </h3>
                      <div className="space-y-3">
                        {pendingUsers.map(u => (
                          <div key={u.id} className="card p-4 border border-yellow-500/10 flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-white">{u.name}</p>
                              <p className="text-sm text-white/40">{u.email} · {u.phone}</p>
                              <p className="text-xs text-white/30 mt-0.5">Applied {u.createdAt?.toDate?.().toLocaleDateString('en-NG')}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => approveUser(u.id)}
                                className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                                <CheckCircle size={12}/> Approve
                              </button>
                              <button onClick={() => rejectUser(u.id)}
                                className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                                <XCircle size={12}/> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                      <Users size={16} className="text-emerald-400"/> Active Members ({members.filter(m=>m.isActive).length})
                    </h3>
                    <div className="card overflow-hidden">
                      <table className="data-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Share</th><th>Joined</th><th>Status</th></tr></thead>
                        <tbody>
                          {members.map(m => (
                            <tr key={m.id}>
                              <td className="font-medium text-white">{m.name}</td>
                              <td className="text-white/50">{m.email}</td>
                              <td className="text-emerald-400 font-semibold">{m.sharePercent.toFixed(2)}%</td>
                              <td className="text-white/40 text-xs">{formatMonth(m.joinedMonth)}</td>
                              <td>
                                {m.isActive
                                  ? <Badge variant="green">Active</Badge>
                                  : <Badge variant="gray">Inactive</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── INCOME TAB ───────────────────────────── */}
              {tab === 'income' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Income Records"
                    subtitle={`Total: ${formatCurrency(totalIncome)}`}
                    action={
                      <button onClick={() => setIncomeModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
                        <Plus size={14}/> Add Income
                      </button>
                    }
                  />
                  <div className="card overflow-hidden">
                    {income.length === 0 ? (
                      <EmptyState icon={<TrendingUp size={24}/>} title="No income recorded" description="Add income sources to track fund growth." />
                    ) : (
                      <table className="data-table">
                        <thead><tr><th>Source</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead>
                        <tbody>
                          {income.map(i => (
                            <tr key={i.id}>
                              <td className="font-medium text-white">{i.source}</td>
                              <td className="text-emerald-400 font-semibold">+ {formatCurrency(i.amount)}</td>
                              <td className="text-white/40 text-sm">{i.description || '—'}</td>
                              <td className="text-white/30 text-xs">{i.createdAt?.toDate?.().toLocaleDateString('en-NG')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── WITHDRAWALS TAB ──────────────────────── */}
              {tab === 'withdrawals' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Withdrawal Records"
                    subtitle={`Total withdrawn: ${formatCurrency(totalWithdrawals)}`}
                    action={
                      <button onClick={() => setWithdrawalModal(true)} className="btn-danger flex items-center gap-2 text-sm px-4 py-2.5">
                        <ArrowDownLeft size={14}/> Record Withdrawal
                      </button>
                    }
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                    {(['exit','investment','expense','other'] as const).map(type => {
                      const total = withdrawals.filter(w=>w.type===type).reduce((s,w)=>s+w.amount,0)
                      return (
                        <div key={type} className="card p-4 text-center">
                          <p className="text-xs text-white/30 uppercase tracking-wider mb-1 capitalize">{type}</p>
                          <p className="font-bold text-red-400">{formatCurrency(total)}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="card overflow-hidden">
                    {withdrawals.length === 0 ? (
                      <EmptyState icon={<ArrowDownLeft size={24}/>} title="No withdrawals recorded" />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table">
                          <thead><tr><th>Amount</th><th>Type</th><th>Reason</th><th>Member</th><th>Recorded By</th><th>Date</th></tr></thead>
                          <tbody>
                            {withdrawals.map(w => (
                              <tr key={w.id}>
                                <td className="font-bold text-red-400">− {formatCurrency(w.amount)}</td>
                                <td>
                                  <span className={`badge text-xs capitalize ${
                                    w.type==='exit' ? 'badge-red' :
                                    w.type==='investment' ? 'badge-blue' :
                                    w.type==='expense' ? 'badge-yellow' : 'badge-gray'
                                  }`}>{w.type}</span>
                                </td>
                                <td className="text-white/60 text-sm max-w-xs truncate">{w.reason}</td>
                                <td className="text-white/40 text-sm">{w.memberName || '—'}</td>
                                <td className="text-white/30 text-xs font-mono">{w.createdBy.slice(0,8)}...</td>
                                <td className="text-white/30 text-xs whitespace-nowrap">{w.createdAt?.toDate?.().toLocaleDateString('en-NG')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── MILESTONES TAB ───────────────────────── */}
              {tab === 'milestones' && (
                <div className="space-y-6">
                  <SectionHeader
                    title="Roadmap Milestones"
                    action={
                      <button onClick={() => setMilestoneModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
                        <Plus size={14}/> Add Milestone
                      </button>
                    }
                  />
                  <div className="space-y-4">
                    {milestones.length === 0 ? (
                      <div className="card p-8">
                        <EmptyState icon={<MapPin size={24}/>} title="No milestones yet" description="Add milestones to track progress." />
                      </div>
                    ) : milestones.map(m => (
                      <div key={m.id} className="card p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-semibold text-white">{m.title}</h3>
                            <p className="text-sm text-white/40 mt-1">{m.description}</p>
                          </div>
                          <span className={`badge text-xs ${
                            m.status==='completed'?'badge-green':m.status==='in_progress'?'badge-yellow':'badge-gray'
                          } capitalize`}>{m.status}</span>
                        </div>
                        <ProgressBar value={milestoneProgress[m.id] ?? m.progress} max={100} />
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="range" min={0} max={100}
                            value={milestoneProgress[m.id] ?? m.progress}
                            onChange={e => setMilestoneProgress(prev => ({...prev, [m.id]: parseInt(e.target.value)}))}
                            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                          />
                          <span className="text-xs text-white/40 w-10 text-right">{milestoneProgress[m.id] ?? m.progress}%</span>
                          <button
                            onClick={() => updateMilestoneProgress(m.id, milestoneProgress[m.id] ?? m.progress)}
                            className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TEST DATA TAB ──────────────────────────── */}
              {tab === 'testdata' && (
                <div className="space-y-6">
                  <SectionHeader title="Test Data" subtitle="Seed realistic data or wipe everything for a clean slate." />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-5 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <FlaskConical size={18} className="text-emerald-400"/>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Seed Test Data</h3>
                        <p className="text-xs text-white/40 mt-1">Creates 3 members, 5 months each, income records, withdrawals & milestones.</p>
                      </div>
                      <button onClick={() => testDataAction('seed')} disabled={testDataLoading}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2 py-2.5">
                        {testDataLoading ? <Spinner size={14}/> : <FlaskConical size={14}/>} Seed Data
                      </button>
                    </div>
                    <div className="card p-5 space-y-3 border-yellow-500/10">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                        <Trash2 size={18} className="text-yellow-400"/>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Wipe Transactions</h3>
                        <p className="text-xs text-white/40 mt-1">Deletes payments, contributions, months, income, withdrawals. Keeps user accounts.</p>
                      </div>
                      <button onClick={() => testDataAction('wipe')} disabled={testDataLoading}
                        className="btn-gold w-full text-sm flex items-center justify-center gap-2 py-2.5">
                        {testDataLoading ? <Spinner size={14}/> : <Trash2 size={14}/>} Wipe Transactions
                      </button>
                    </div>
                    <div className="card p-5 space-y-3 border-red-500/10">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <Trash2 size={18} className="text-red-400"/>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Full Reset</h3>
                        <p className="text-xs text-white/40 mt-1">Deletes ALL data including test members. Only your admin account is kept.</p>
                      </div>
                      <button onClick={() => testDataAction('wipe_all')} disabled={testDataLoading}
                        className="btn-danger w-full text-sm flex items-center justify-center gap-2 py-2.5">
                        {testDataLoading ? <Spinner size={14}/> : <Trash2 size={14}/>} Full Reset
                      </button>
                    </div>
                  </div>
                  {testDataResult && (
                    <div className="card p-4 bg-white/[0.02]">
                      <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Result</p>
                      <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                        {JSON.stringify(testDataResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* ── EXITS TAB ────────────────────────────── */}
              {tab === 'exits' && (
                <div className="space-y-6">
                  <SectionHeader title="Exit Requests" subtitle={`${exits.filter(e=>e.status==='pending').length} pending`} />
                  <div className="space-y-4">
                    {exits.length === 0 ? (
                      <div className="card p-8">
                        <EmptyState icon={<Activity size={24}/>} title="No exit requests" />
                      </div>
                    ) : exits.map(e => (
                      <div key={e.id} className="card p-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white">{e.userName}</h3>
                              {e.status==='pending'?<Badge variant="yellow">Pending</Badge>:
                               e.status==='approved'?<Badge variant="green">Approved</Badge>:
                               <Badge variant="red">Rejected</Badge>}
                            </div>
                            <p className="text-sm text-white/40">{e.reason || 'No reason provided'}</p>
                          </div>
                          <p className="text-xs text-white/30 whitespace-nowrap">{e.createdAt?.toDate?.().toLocaleDateString('en-NG')}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm mb-4">
                          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                            <p className="text-xs text-white/30 mb-1">Contributions</p>
                            <p className="font-bold text-white">{formatCurrency(e.totalContributions)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                            <p className="text-xs text-white/30 mb-1">Profit Share</p>
                            <p className="font-bold text-emerald-400">{formatCurrency(e.profitShare)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
                            <p className="text-xs text-white/30 mb-1">Exit Fee (7.5%)</p>
                            <p className="font-bold text-red-400">− {formatCurrency(e.exitFee)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/10 text-center">
                            <p className="text-xs text-white/30 mb-1">Final Payout</p>
                            <p className="font-bold text-emerald-400">{formatCurrency(e.finalPayout)}</p>
                          </div>
                        </div>
                        {e.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => approveExit(e.id)}
                              className="flex items-center gap-1 text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors">
                              <CheckCircle size={14}/> Approve Exit
                            </button>
                            <button onClick={() => rejectExit(e.id)}
                              className="flex items-center gap-1 text-sm bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors">
                              <XCircle size={14}/> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────── */}
      <Modal open={incomeModal} onClose={() => setIncomeModal(false)} title="Record Income">
        <div className="space-y-4">
          <div><label className="label">Income Source</label>
            <input className="input" placeholder="e.g. Real estate rental, stock dividends" value={incomeForm.source} onChange={e=>setIncomeForm(p=>({...p,source:e.target.value}))} /></div>
          <div><label className="label">Amount (₦)</label>
            <input className="input" type="number" placeholder="0.00" value={incomeForm.amount} onChange={e=>setIncomeForm(p=>({...p,amount:e.target.value}))} /></div>
          <div><label className="label">Description (optional)</label>
            <input className="input" placeholder="Additional notes" value={incomeForm.description} onChange={e=>setIncomeForm(p=>({...p,description:e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIncomeModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={addIncome} disabled={submitting||!incomeForm.source||!incomeForm.amount} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting?<Spinner size={14}/>:<Plus size={14}/>} Record Income
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={withdrawalModal} onClose={() => setWithdrawalModal(false)} title="Record Withdrawal">
        <div className="space-y-4">
          <div><label className="label">Amount (₦)</label>
            <input className="input" type="number" placeholder="0.00" value={withdrawalForm.amount} onChange={e=>setWithdrawalForm(p=>({...p,amount:e.target.value}))} /></div>
          <div><label className="label">Withdrawal Type</label>
            <select className="input" value={withdrawalForm.type} onChange={e=>setWithdrawalForm(p=>({...p,type:e.target.value}))}>
              <option value="exit">Exit Payout</option>
              <option value="investment">Investment</option>
              <option value="expense">Expense</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">Reason (required)</label>
            <textarea className="input resize-none" rows={3} placeholder="Explain the reason for this withdrawal..." value={withdrawalForm.reason} onChange={e=>setWithdrawalForm(p=>({...p,reason:e.target.value}))} /></div>
          <div><label className="label">Associated Member (optional)</label>
            <select className="input" value={withdrawalForm.memberId} onChange={e=>setWithdrawalForm(p=>({...p,memberId:e.target.value}))}>
              <option value="">None</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setWithdrawalModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={addWithdrawal} disabled={submitting||!withdrawalForm.amount||!withdrawalForm.reason} className="btn-danger flex-1 flex items-center justify-center gap-2">
              {submitting?<Spinner size={14}/>:<ArrowDownLeft size={14}/>} Record Withdrawal
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={milestoneModal} onClose={() => setMilestoneModal(false)} title="Add Milestone">
        <div className="space-y-4">
          <div><label className="label">Title</label>
            <input className="input" placeholder="e.g. First property acquisition" value={milestoneForm.title} onChange={e=>setMilestoneForm(p=>({...p,title:e.target.value}))} /></div>
          <div><label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={milestoneForm.description} onChange={e=>setMilestoneForm(p=>({...p,description:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Target Amount (₦)</label>
              <input className="input" type="number" placeholder="0" value={milestoneForm.targetAmount} onChange={e=>setMilestoneForm(p=>({...p,targetAmount:e.target.value}))} /></div>
            <div><label className="label">Target Date</label>
              <input className="input" type="month" value={milestoneForm.targetDate} onChange={e=>setMilestoneForm(p=>({...p,targetDate:e.target.value}))} /></div>
          </div>
          <div><label className="label">Order</label>
            <input className="input" type="number" value={milestoneForm.order} onChange={e=>setMilestoneForm(p=>({...p,order:e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setMilestoneModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={addMilestone} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting?<Spinner size={14}/>:<Plus size={14}/>} Add Milestone
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason('') }} title="Reject Payment">
        <div className="space-y-4">
          <p className="text-sm text-white/60">Provide a reason for rejecting this payment. The member will be notified and their months will revert to unpaid.</p>
          <div><label className="label">Rejection Reason</label>
            <textarea className="input resize-none" rows={3} placeholder="e.g. Bank transfer not received, wrong amount..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)} /></div>
          <div className="flex gap-3">
            <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={rejectPayment} disabled={submitting} className="btn-danger flex-1 flex items-center justify-center gap-2">
              {submitting?<Spinner size={14}/>:<XCircle size={14}/>} Confirm Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
