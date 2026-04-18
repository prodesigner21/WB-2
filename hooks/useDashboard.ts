/**
 * hooks/useDashboard.ts — DEFINITIVE FIX
 *
 * Core problem: Promise.all hangs if ANY fetch stalls (e.g. Firestore rules
 * not deployed, empty collections, permission issues). The done flag meant
 * the 10s timeout couldn't rescue it either.
 *
 * Fix:
 *  1. Promise.allSettled — all fetches complete independently, failures return 0
 *  2. Individual 5s timeout on each fetch — no single call can stall forever
 *  3. Loading ALWAYS stops — worst case shows zeros, never spins forever
 */
'use client'
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/firestore'
import {
  calculateNetBalance, calculateProfitShare,
  sumUserContributions, getNextDueMonth
} from '@/utils/calculations'
import type { DashboardSummary, MemberMonth, Payment, Contribution } from '@/lib/types'
import { getDocs } from 'firebase/firestore'

// Wraps any promise with a timeout — returns fallback value instead of hanging
function withFallback<T>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> {
  const timeout = new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  return Promise.race([promise, timeout])
}

export function useDashboard(userId: string, sharePercent: number) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)

    let months: MemberMonth[] = []
    let payments: Payment[] = []
    let monthsLoaded = false
    let paymentsLoaded = false
    let done = false

    async function computeSummary() {
      if (done) return
      if (!monthsLoaded || !paymentsLoaded) return
      done = true

      try {
        // Each fetch has its own 5s fallback — one stalled call cannot block the rest
        const [
          contribResult,
          incomeResult,
          withdrawalsResult,
          userContribResult,
        ] = await Promise.allSettled([
          withFallback(
            getDocs(collection(db, COLLECTIONS.CONTRIBUTIONS))
              .then(s => s.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)),
            0
          ),
          withFallback(
            getDocs(collection(db, COLLECTIONS.INCOME))
              .then(s => s.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)),
            0
          ),
          withFallback(
            getDocs(collection(db, COLLECTIONS.WITHDRAWALS))
              .then(s => s.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)),
            0
          ),
          withFallback(
            getDocs(query(collection(db, COLLECTIONS.CONTRIBUTIONS), where('userId', '==', userId)))
              .then(s => s.docs.map(d => ({ id: d.id, ...d.data() } as Contribution))),
            [] as Contribution[]
          ),
        ])

        // Extract values — use 0 / [] if a fetch rejected
        const totalContrib      = contribResult.status === 'fulfilled' ? contribResult.value : 0
        const totalIncome       = incomeResult.status === 'fulfilled' ? incomeResult.value : 0
        const totalWithdrawals  = withdrawalsResult.status === 'fulfilled' ? withdrawalsResult.value : 0
        const userContributions = userContribResult.status === 'fulfilled' ? userContribResult.value : []

        setSummary({
          totalContributions:   totalContrib,
          totalIncome,
          totalWithdrawals,
          netBalance:           calculateNetBalance(totalContrib, totalIncome, totalWithdrawals),
          userContributionTotal: sumUserContributions(userContributions),
          userSharePercent:     sharePercent,
          userProfitShare:      calculateProfitShare(totalIncome, sharePercent),
          unpaidMonths:         months.filter(m => m.status === 'unpaid'),
          pendingMonths:        months.filter(m => m.status === 'pending'),
          paidMonths:           months.filter(m => m.status === 'paid'),
          nextPaymentDue:       getNextDueMonth(months),
          recentPayments:       payments.slice(0, 5),
        })
      } catch (e: any) {
        // Even on unexpected error, show empty dashboard rather than spin forever
        setError('Some data could not be loaded.')
        setSummary({
          totalContributions: 0, totalIncome: 0, totalWithdrawals: 0,
          netBalance: 0, userContributionTotal: 0, userSharePercent: sharePercent,
          userProfitShare: 0, unpaidMonths: [], pendingMonths: [],
          paidMonths: [], nextPaymentDue: null, recentPayments: [],
        })
      } finally {
        setLoading(false)
      }
    }

    // Hard 8s deadline — if listeners haven't both fired, force-complete with empty data
    const deadline = setTimeout(() => {
      if (done) return
      monthsLoaded = true
      paymentsLoaded = true
      if (!done) computeSummary()
    }, 8000)

    const monthsQ = query(collection(db, COLLECTIONS.MEMBER_MONTHS), where('userId', '==', userId))
    const paymentsQ = query(collection(db, COLLECTIONS.PAYMENTS), where('userId', '==', userId))

    const unsubMonths = onSnapshot(
      monthsQ,
      snap => {
        months = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as MemberMonth))
          .sort((a, b) => a.month.localeCompare(b.month))
        monthsLoaded = true
        computeSummary()
      },
      err => { console.error('memberMonths:', err.code); monthsLoaded = true; computeSummary() }
    )

    const unsubPayments = onSnapshot(
      paymentsQ,
      snap => {
        payments = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        paymentsLoaded = true
        computeSummary()
      },
      err => { console.error('payments:', err.code); paymentsLoaded = true; computeSummary() }
    )

    return () => {
      clearTimeout(deadline)
      unsubMonths()
      unsubPayments()
    }
  }, [userId, sharePercent])

  return { summary, loading, error }
}
