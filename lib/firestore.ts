/**
 * lib/firestore.ts — FIXED
 *
 * Root cause of infinite loading on all pages:
 * Firestore compound queries (where + orderBy) require deployed composite
 * indexes. Without them the query fails SILENTLY — onSnapshot/getDocs never
 * resolve, setLoading(false) never runs, spinner spins forever.
 *
 * Fix: removed orderBy from all compound where() queries.
 *      Sorting is done client-side after the data arrives.
 *      Simple single-field orderBy queries (no where clause) are fine.
 */
import {
  collection, doc, getDoc, getDocFromServer, getDocs, setDoc,
  updateDoc, addDoc, query, where, orderBy, onSnapshot,
  writeBatch, serverTimestamp, Timestamp, DocumentData, QueryConstraint
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  UserProfile, Payment, Contribution, MemberMonth,
  Income, Withdrawal, ExitRequest, Milestone, AuditLog
} from './types'

// ─── COLLECTIONS ─────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS: 'users',
  PAYMENTS: 'payments',
  CONTRIBUTIONS: 'contributions',
  MEMBER_MONTHS: 'memberMonths',
  INCOME: 'income',
  WITHDRAWALS: 'withdrawals',
  EXIT_REQUESTS: 'exitRequests',
  MILESTONES: 'milestones',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
} as const

// ─── USER OPERATIONS ─────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // getDocFromServer bypasses local cache — ensures role changes are picked up immediately
  try {
    const snap = await getDocFromServer(doc(db, COLLECTIONS.USERS, userId))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null
  } catch {
    // Fall back to cached read if server read fails (e.g. offline)
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null
  }
}

export async function createUserProfile(userId: string, data: Omit<UserProfile, 'id'>): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllMembers(): Promise<UserProfile[]> {
  // Single where clause — no composite index needed
  const q = query(collection(db, COLLECTIONS.USERS), where('role', 'in', ['member', 'admin']))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))
}

export async function getPendingUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, COLLECTIONS.USERS), where('role', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile))
}

// ─── MEMBER MONTHS ───────────────────────────────────────────────

export async function getMemberMonths(userId: string): Promise<MemberMonth[]> {
  // FIXED: removed orderBy — was causing silent failure (missing composite index)
  // Sort client-side instead
  const q = query(
    collection(db, COLLECTIONS.MEMBER_MONTHS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as MemberMonth))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export async function initializeMemberMonths(userId: string, startMonth: string): Promise<void> {
  const monthDoc = doc(collection(db, COLLECTIONS.MEMBER_MONTHS))
  await setDoc(monthDoc, {
    userId,
    month: startMonth,
    status: 'unpaid',
    createdAt: serverTimestamp(),
  })
}

// ─── PAYMENTS ────────────────────────────────────────────────────

export async function getUserPayments(userId: string): Promise<Payment[]> {
  // FIXED: removed orderBy — sort client-side
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime  // newest first
    })
}

export async function getAllPayments(): Promise<Payment[]> {
  // Simple collection scan — no index needed
  const snap = await getDocs(collection(db, COLLECTIONS.PAYMENTS))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

export async function createPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.PAYMENTS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

// ─── CONTRIBUTIONS ───────────────────────────────────────────────

export async function getUserContributions(userId: string): Promise<Contribution[]> {
  // FIXED: removed orderBy
  const q = query(
    collection(db, COLLECTIONS.CONTRIBUTIONS),
    where('userId', '==', userId)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Contribution))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

export async function getTotalContributions(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTIONS.CONTRIBUTIONS))
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)
}

// ─── INCOME ──────────────────────────────────────────────────────

export async function getAllIncome(): Promise<Income[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.INCOME))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Income))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

export async function addIncome(data: Omit<Income, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.INCOME), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getTotalIncome(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTIONS.INCOME))
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)
}

// ─── WITHDRAWALS ─────────────────────────────────────────────────

export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.WITHDRAWALS))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Withdrawal))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

export async function createWithdrawal(data: Omit<Withdrawal, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.WITHDRAWALS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getTotalWithdrawals(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTIONS.WITHDRAWALS))
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)
}

// ─── EXIT REQUESTS ───────────────────────────────────────────────

export async function createExitRequest(data: Omit<ExitRequest, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.EXIT_REQUESTS), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getExitRequests(): Promise<ExitRequest[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.EXIT_REQUESTS))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ExitRequest))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

// ─── MILESTONES ──────────────────────────────────────────────────

export async function getMilestones(): Promise<Milestone[]> {
  const snap = await getDocs(collection(db, COLLECTIONS.MILESTONES))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Milestone))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function addMilestone(data: Omit<Milestone, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.MILESTONES), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateMilestone(id: string, data: Partial<Milestone>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.MILESTONES, id), data)
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────

export async function addAuditLog(data: Omit<AuditLog, 'id'>): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
    ...data,
    timestamp: serverTimestamp(),
  })
}

// ─── SETTINGS ────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, any>> {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'global'))
  return snap.exists() ? snap.data() : {}
}

export async function updateSettings(data: Record<string, any>): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), data, { merge: true })
}

// ─── REAL-TIME LISTENERS ─────────────────────────────────────────
// FIXED: removed orderBy from both — were causing silent failures

export function subscribeToUserPayments(userId: string, callback: (payments: Payment[]) => void, onError?: (e: Error) => void) {
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('userId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const payments = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Payment))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    callback(payments)
  }, onError)
}

export function subscribeToMemberMonths(userId: string, callback: (months: MemberMonth[]) => void, onError?: (e: Error) => void) {
  const q = query(
    collection(db, COLLECTIONS.MEMBER_MONTHS),
    where('userId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const months = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as MemberMonth))
      .sort((a, b) => a.month.localeCompare(b.month))
    callback(months)
  }, onError)
}
