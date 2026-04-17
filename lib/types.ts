/**
 * lib/types.ts
 * Central type definitions for the Wealth Building LLC Platform.
 */
import { Timestamp } from 'firebase/firestore'

// ─── USER & AUTH ─────────────────────────────────────────────────

export type UserRole = 'admin' | 'member' | 'pending'

export interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  sharePercent: number         // e.g. 10 for 10%
  joinedMonth: string          // YYYY-MM — first month they must pay
  contractAccepted: boolean
  isActive: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

// ─── MEMBER MONTHS ───────────────────────────────────────────────

export type MonthStatus = 'unpaid' | 'pending' | 'paid'

export interface MemberMonth {
  id: string
  userId: string
  month: string   // YYYY-MM
  status: MonthStatus
  paymentId?: string
  createdAt: Timestamp | null
}

// ─── PAYMENTS ────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'approved' | 'rejected'

export interface Payment {
  id: string
  userId: string
  userName: string
  monthsPaid: string[]         // ['2024-01', '2024-02']
  amount: number               // in kobo (Paystack) or base currency units
  reference: string            // Paystack reference
  paystackReference?: string
  status: PaymentStatus
  rejectionReason?: string
  approvedBy?: string
  approvedAt?: Timestamp | null
  createdAt: Timestamp | null
}

// ─── CONTRIBUTIONS ───────────────────────────────────────────────

export interface Contribution {
  id: string
  userId: string
  month: string
  amount: number
  paymentId: string
  createdAt: Timestamp | null
}

// ─── INCOME ──────────────────────────────────────────────────────

export interface Income {
  id: string
  source: string
  amount: number
  description?: string
  addedBy: string
  createdAt: Timestamp | null
}

// ─── WITHDRAWALS ─────────────────────────────────────────────────

export type WithdrawalType = 'exit' | 'investment' | 'expense' | 'other'

export interface Withdrawal {
  id: string
  amount: number
  type: WithdrawalType
  reason: string
  memberId?: string            // if related to a specific member (e.g. exit payout)
  memberName?: string
  createdBy: string
  createdAt: Timestamp | null
}

// ─── EXIT REQUESTS ───────────────────────────────────────────────

export type ExitStatus = 'pending' | 'approved' | 'rejected'

export interface ExitRequest {
  id: string
  userId: string
  userName: string
  totalContributions: number
  profitShare: number
  exitFee: number
  finalPayout: number
  reason: string
  status: ExitStatus
  reviewedBy?: string
  reviewedAt?: Timestamp | null
  createdAt: Timestamp | null
}

// ─── MILESTONES ──────────────────────────────────────────────────

export interface Milestone {
  id: string
  title: string
  description: string
  targetAmount: number
  progress: number             // 0–100
  order: number
  status: 'upcoming' | 'in_progress' | 'completed'
  targetDate?: string
  completedAt?: Timestamp | null
  createdAt: Timestamp | null
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────

export type AuditAction =
  | 'payment_approved'
  | 'payment_rejected'
  | 'user_approved'
  | 'user_rejected'
  | 'income_added'
  | 'withdrawal_added'
  | 'exit_approved'
  | 'exit_rejected'
  | 'shares_recalculated'
  | 'milestone_added'

export interface AuditLog {
  id: string
  action: AuditAction
  performedBy: string          // admin userId
  targetId?: string            // affected entity ID
  details: string
  timestamp: Timestamp | null
}

// ─── DASHBOARD SUMMARY ───────────────────────────────────────────

export interface DashboardSummary {
  totalContributions: number
  totalIncome: number
  totalWithdrawals: number
  netBalance: number
  userContributionTotal: number
  userSharePercent: number
  userProfitShare: number
  unpaidMonths: MemberMonth[]
  pendingMonths: MemberMonth[]
  paidMonths: MemberMonth[]
  nextPaymentDue: string | null
  recentPayments: Payment[]
}

// ─── ADMIN ANALYTICS ─────────────────────────────────────────────

export interface AdminAnalytics {
  totalMembers: number
  activeMembers: number
  pendingMembers: number
  totalContributions: number
  totalIncome: number
  totalWithdrawals: number
  netBalance: number
  pendingPayments: Payment[]
  complianceRate: number       // % of members fully paid up
  monthlyInflow: { month: string; amount: number }[]
}
