/**
 * utils/calculations.ts
 * Pure business-logic functions.
 * No DB calls, no side effects — fully testable.
 */
import { format, addMonths, parse, startOfMonth } from 'date-fns'
import type { MemberMonth, Payment, Contribution } from '@/lib/types'

// ─── MONTH UTILITIES ─────────────────────────────────────────────

/** Get current month as YYYY-MM */
export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/** Generate a sequence of YYYY-MM strings from start to end (inclusive) */
export function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = []
  let current = parse(start, 'yyyy-MM', new Date())
  const endDate = parse(end, 'yyyy-MM', new Date())
  while (current <= endDate) {
    months.push(format(current, 'yyyy-MM'))
    current = addMonths(current, 1)
  }
  return months
}

/** Format YYYY-MM for display (e.g. "Jan 2024") */
export function formatMonth(month: string): string {
  try {
    return format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy')
  } catch {
    return month
  }
}

// ─── MONTH PAYMENT LOGIC ─────────────────────────────────────────

/**
 * Returns the oldest N unpaid months for a member.
 * Enforces no-skipping rule: months must be paid in order.
 */
export function getNextUnpaidMonths(memberMonths: MemberMonth[], count: number): string[] {
  const unpaid = memberMonths
    .filter(m => m.status === 'unpaid')
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(0, count)
  return unpaid.map(m => m.month)
}

/**
 * Determine how many months are outstanding (unpaid or pending)
 */
export function countOutstandingMonths(memberMonths: MemberMonth[]): number {
  return memberMonths.filter(m => m.status === 'unpaid').length
}

/**
 * Get the next due month (oldest unpaid)
 */
export function getNextDueMonth(memberMonths: MemberMonth[]): string | null {
  const unpaid = memberMonths
    .filter(m => m.status === 'unpaid')
    .sort((a, b) => a.month.localeCompare(b.month))
  return unpaid.length > 0 ? unpaid[0].month : null
}

// ─── FINANCIAL CALCULATIONS ───────────────────────────────────────

/**
 * Calculate equal ownership share for N members
 * Returns percentage (e.g. 10 for 10%)
 */
export function calculateEqualShare(totalMembers: number): number {
  if (totalMembers === 0) return 0
  return parseFloat((100 / totalMembers).toFixed(4))
}

/**
 * Calculate a member's profit share from total income
 */
export function calculateProfitShare(totalIncome: number, sharePercent: number): number {
  return (totalIncome * sharePercent) / 100
}

/**
 * Calculate exit payout
 * EXIT FEE = 7.5%
 * Final = (contributions + profitShare) * (1 - 0.075)
 */
export const EXIT_FEE_PERCENT = 7.5

export function calculateExitPayout(
  totalContributions: number,
  profitShare: number
): {
  gross: number
  exitFee: number
  netPayout: number
} {
  const gross = totalContributions + profitShare
  const exitFee = (gross * EXIT_FEE_PERCENT) / 100
  const netPayout = gross - exitFee
  return { gross, exitFee, netPayout }
}

/**
 * Calculate net balance of the fund
 * Net = Contributions + Income - Withdrawals
 */
export function calculateNetBalance(
  totalContributions: number,
  totalIncome: number,
  totalWithdrawals: number
): number {
  return totalContributions + totalIncome - totalWithdrawals
}

/**
 * Sum total contributions for a specific user
 */
export function sumUserContributions(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amount, 0)
}

/**
 * Calculate compliance rate: what % of members have no unpaid months
 */
export function calculateComplianceRate(
  memberMonthsMap: Map<string, MemberMonth[]>
): number {
  const total = memberMonthsMap.size
  if (total === 0) return 100
  let compliant = 0
  for (const months of memberMonthsMap.values()) {
    const hasUnpaid = months.some(m => m.status === 'unpaid')
    if (!hasUnpaid) compliant++
  }
  return Math.round((compliant / total) * 100)
}

// ─── CURRENCY FORMATTING ─────────────────────────────────────────

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦'

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) return `${CURRENCY_SYMBOL}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${CURRENCY_SYMBOL}${(amount / 1_000).toFixed(1)}K`
  return formatCurrency(amount)
}

// ─── MONTHLY BREAKDOWN ───────────────────────────────────────────

/**
 * Group payments by month for chart display
 */
export function buildMonthlyInflow(
  contributions: Contribution[]
): { month: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const c of contributions) {
    const current = map.get(c.month) || 0
    map.set(c.month, current + c.amount)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month: formatMonth(month), amount }))
}
