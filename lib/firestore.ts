/**
 * lib/firestore.ts
 * All Firestore read/write operations.
 * Keeps DB logic separated from UI and business logic.
 */
import {
  collection, doc, getDoc, getDocFromServer, getDocs, setDoc, updateDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch,
  serverTimestamp, Timestamp, DocumentData, QueryConstraint
} from 'firebase/firestore'
import { db } from './firebase'
import type { UserProfile, Payment, Contribution, MemberMonth, Income, Withdrawal, ExitRequest, Milestone, AuditLog } from './types'

// ─── COLLECTIONS ────────────────────────────────────────────────
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

// ─── USER OPERATIONS ────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Always fetch from server — bypasses local cache so role changes in
  // Firebase console are reflected immediately on next login
  const snap = await getDocFromServer(doc(db, COLLECTIONS.USERS, userId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserProfile) : null
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
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where('role', 'in', ['member', 'admin'])
  )
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
  const q = query(
    collection(db, COLLECTIONS.MEMBER_MONTHS),
    where('userId', '==', userId),
    orderBy('month', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MemberMonth))
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
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
}

export async function getAllPayments(statusFilter?: string): Promise<Payment[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (statusFilter) constraints.unshift(where('status', '==', statusFilter))
  const q = query(collection(db, COLLECTIONS.PAYMENTS), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
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
  const q = query(
    collection(db, COLLECTIONS.CONTRIBUTIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution))
}

export async function getTotalContributions(): Promise<number> {
  const snap = await getDocs(collection(db, COLLECTIONS.CONTRIBUTIONS))
  return snap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0)
}

// ─── INCOME ──────────────────────────────────────────────────────

export async function getAllIncome(): Promise<Income[]> {
  const q = query(collection(db, COLLECTIONS.INCOME), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Income))
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
  const q = query(collection(db, COLLECTIONS.WITHDRAWALS), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal))
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
  const q = query(collection(db, COLLECTIONS.EXIT_REQUESTS), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExitRequest))
}

// ─── MILESTONES ──────────────────────────────────────────────────

export async function getMilestones(): Promise<Milestone[]> {
  const q = query(collection(db, COLLECTIONS.MILESTONES), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Milestone))
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

export function subscribeToUserPayments(userId: string, callback: (payments: Payment[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)))
  })
}

export function subscribeToMemberMonths(userId: string, callback: (months: MemberMonth[]) => void) {
  const q = query(
    collection(db, COLLECTIONS.MEMBER_MONTHS),
    where('userId', '==', userId),
    orderBy('month', 'asc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as MemberMonth)))
  })
}
