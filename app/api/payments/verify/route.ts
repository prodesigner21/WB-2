/**
 * app/api/payments/verify/route.ts
 * Verifies a Paystack payment server-side, then stores it as "pending" in Firestore.
 * Payment does NOT count until admin approves.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reference, userId } = body

    if (!reference || !userId) {
      return NextResponse.json({ error: 'Missing reference or userId' }, { status: 400 })
    }

    // ── Verify with Paystack ─────────────────────────────────────
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    })
    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    const { metadata, amount, reference: paystackRef } = verifyData.data
    const months: string[] = metadata?.months || []

    // ── Check for duplicate reference ────────────────────────────
    const existing = await adminDb
      .collection('payments')
      .where('reference', '==', reference)
      .get()

    if (!existing.empty) {
      return NextResponse.json({ message: 'Payment already recorded', alreadyExists: true })
    }

    // ── Guard: metadata userId must match request userId ─────────
    if (metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Metadata mismatch' }, { status: 403 })
    }

    // ── Store payment as "pending" (awaiting admin approval) ─────
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userName = userDoc.data()?.name || 'Unknown'

    const paymentRef = adminDb.collection('payments').doc()
    await paymentRef.set({
      userId,
      userName,
      monthsPaid: months,
      amount: amount / 100,  // convert from kobo back to base
      reference,
      paystackReference: paystackRef,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    // ── Mark months as "pending" (payment submitted, not approved yet) ──
    const batch = adminDb.batch()
    for (const month of months) {
      const monthQuery = await adminDb
        .collection('memberMonths')
        .where('userId', '==', userId)
        .where('month', '==', month)
        .get()
      monthQuery.forEach(doc => {
        batch.update(doc.ref, { status: 'pending', paymentId: paymentRef.id })
      })
    }
    await batch.commit()

    // ── Write audit log ──────────────────────────────────────────
    await adminDb.collection('auditLogs').add({
      action: 'payment_submitted',
      performedBy: userId,
      targetId: paymentRef.id,
      details: `Payment submitted for months: ${months.join(', ')} — ₦${(amount / 100).toLocaleString()}`,
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      paymentId: paymentRef.id,
      message: 'Payment recorded. Awaiting admin approval.',
    })
  } catch (error: any) {
    console.error('[/api/payments/verify]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET handler for Paystack redirect callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(new URL('/dashboard?payment=failed', process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Redirect to the pay page to handle verification client-side
  return NextResponse.redirect(
    new URL(`/pay?verify=${reference}`, process.env.NEXT_PUBLIC_APP_URL!)
  )
}
