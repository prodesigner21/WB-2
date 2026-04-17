/**
 * app/api/admin/withdrawals/route.ts
 * Admin: record withdrawals from the fund.
 * Supports exit payouts, investments, expenses, other.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
    }

    const { amount, type, reason, memberId } = await req.json()

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'Reason is required (min 5 characters)' }, { status: 400 })
    }
    const validTypes = ['exit', 'investment', 'expense', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid withdrawal type' }, { status: 400 })
    }

    // Optionally attach member name if this is for a specific member
    let memberName: string | null = null
    if (memberId) {
      const memberDoc = await adminDb.collection('users').doc(memberId).get()
      memberName = memberDoc.exists ? memberDoc.data()?.name : null
    }

    const ref = adminDb.collection('withdrawals').doc()
    await ref.set({
      amount: parseFloat(amount),
      type,
      reason: reason.trim(),
      memberId: memberId || null,
      memberName: memberName || null,
      createdBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
    })

    await adminDb.collection('auditLogs').add({
      action: 'withdrawal_added',
      performedBy: decoded.uid,
      targetId: ref.id,
      details: `Withdrawal recorded: ₦${parseFloat(amount).toLocaleString()} — Type: ${type} — Reason: ${reason}`,
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error: any) {
    console.error('[/api/admin/withdrawals]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const snap = await adminDb
      .collection('withdrawals')
      .orderBy('createdAt', 'desc')
      .get()

    const withdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ withdrawals })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
