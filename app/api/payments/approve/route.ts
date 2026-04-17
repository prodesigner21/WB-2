/**
 * app/api/payments/approve/route.ts
 * Admin-only: approve or reject a pending payment.
 * On approval: marks months as paid, creates contribution records, updates audit log.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    // ── Verify admin token ───────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)

    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const { paymentId, action, rejectionReason } = await req.json()
    if (!paymentId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const paymentRef = adminDb.collection('payments').doc(paymentId)
    const paymentSnap = await paymentRef.get()
    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentSnap.data()!
    if (payment.status !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 })
    }

    const batch = adminDb.batch()

    if (action === 'approve') {
      // ── Update payment status ──────────────────────────────────
      batch.update(paymentRef, {
        status: 'approved',
        approvedBy: decoded.uid,
        approvedAt: FieldValue.serverTimestamp(),
      })

      // ── Mark each month as paid + create contribution record ───
      for (const month of payment.monthsPaid) {
        // Update memberMonth
        const mq = await adminDb
          .collection('memberMonths')
          .where('userId', '==', payment.userId)
          .where('month', '==', month)
          .get()
        mq.forEach(d => batch.update(d.ref, { status: 'paid' }))

        // Create contribution entry
        const contribRef = adminDb.collection('contributions').doc()
        batch.set(contribRef, {
          userId: payment.userId,
          month,
          amount: payment.amount / payment.monthsPaid.length,
          paymentId,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      // ── Audit log ──────────────────────────────────────────────
      const auditRef = adminDb.collection('auditLogs').doc()
      batch.set(auditRef, {
        action: 'payment_approved',
        performedBy: decoded.uid,
        targetId: paymentId,
        details: `Approved ₦${payment.amount.toLocaleString()} for ${payment.userName} — months: ${payment.monthsPaid.join(', ')}`,
        timestamp: FieldValue.serverTimestamp(),
      })

    } else {
      // ── Reject: revert months back to unpaid ───────────────────
      batch.update(paymentRef, {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Rejected by admin',
        approvedBy: decoded.uid,
        approvedAt: FieldValue.serverTimestamp(),
      })

      for (const month of payment.monthsPaid) {
        const mq = await adminDb
          .collection('memberMonths')
          .where('userId', '==', payment.userId)
          .where('month', '==', month)
          .get()
        mq.forEach(d => batch.update(d.ref, { status: 'unpaid', paymentId: null }))
      }

      const auditRef = adminDb.collection('auditLogs').doc()
      batch.set(auditRef, {
        action: 'payment_rejected',
        performedBy: decoded.uid,
        targetId: paymentId,
        details: `Rejected payment for ${payment.userName}. Reason: ${rejectionReason || 'N/A'}`,
        timestamp: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()
    return NextResponse.json({ success: true, action })
  } catch (error: any) {
    console.error('[/api/payments/approve]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
