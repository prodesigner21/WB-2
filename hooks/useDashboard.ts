/**
 * hooks/useDashboard.ts
 * Fetches and computes all data needed for the member dashboard.
 * Uses real-time Firestore listeners for live updates.
 */
'use client'
import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/firestore'
import {
  getTotalIncome,
  getTotalContributions,
  getTotalWithdrawals,
  getUserContributions,
} from '@/lib/firestore'
import {
  calculateNetBalance,
  calculateProfitShare,
  sumUserContributions,
  getNextDueMonth,
} from '@/utils/calculations'
import type { DashboardSummary, MemberMonth, Payment } from '@/lib/types'

export function useDashboard(userId: string, sharePercent: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)

    // Real-time listener for member months
    const monthsQ = query(
      collection(db, COLLECTIONS.MEMBER_MONTHS),
      where('userId', '==', userId),
      orderBy('month', 'asc')
    )

    // Real-time listener for payments
    const paymentsQ = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    let months: MemberMonth[] = []
    let payments: Payment[] = []
    let monthsLoaded = false
    let paymentsLoaded = false

    async function computeSummary() {
      if (!monthsLoaded || !paymentsLoaded) return
      try {
        const [totalContrib, totalIncome, totalWithdrawals, userContributions] = await Promise.all([
          getTotalContributions(),
          getTotalIncome(),
          getTotalWithdrawals(),
          getUserContributions(userId),
        ])

        const netBalance = calculateNetBalance(totalContrib, totalIncome, totalWithdrawals)
        const userTotal = sumUserContributions(userContributions)
        const profitShare = calculateProfitShare(totalIncome, sharePercent)

        setSummary({
          totalContributions: totalContrib,
          totalIncome,
          totalWithdrawals,
          netBalance,
          userContributionTotal: userTotal,
          userSharePercent: sharePercent,
          userProfitShare: profitShare,
          unpaidMonths: months.filter(m => m.status === 'unpaid'),
          pendingMonths: months.filter(m => m.status === 'pending'),
          paidMonths: months.filter(m => m.status === 'paid'),
          nextPaymentDue: getNextDueMonth(months),
          recentPayments: payments.slice(0, 5),
        })
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    const unsubMonths = onSnapshot(monthsQ, snap => {
      months = snap.docs.map(d => ({ id: d.id, ...d.data() } as MemberMonth))
      monthsLoaded = true
      computeSummary()
    })

    const unsubPayments = onSnapshot(paymentsQ, snap => {
      payments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
      paymentsLoaded = true
      computeSummary()
    })

    return () => {
      unsubMonths()
      unsubPayments()
    }
  }, [userId, sharePercent])

  return { summary, loading, error }
}
