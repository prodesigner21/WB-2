/**
 * app/api/payments/initiate/route.ts
 * Server-side payment initiation via Paystack.
 * Validates request, calculates amount, calls Paystack Initialize Transaction.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!
const MONTHLY_CONTRIBUTION = parseInt(process.env.NEXT_PUBLIC_MONTHLY_CONTRIBUTION || '50000')

export async function POST(req: NextRequest) {
  try {
    // ── Auth verification ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)

    const body = await req.json()
    const { userId, months, email, userName } = body

    // ── Guard: requesting user must match token ──────────────────
    if (decoded.uid !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Validate months array ────────────────────────────────────
    if (!months || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json({ error: 'No months selected' }, { status: 400 })
    }

    // ── Verify these are the oldest unpaid months (no skipping) ──
    const memberMonthsSnap = await adminDb
      .collection('memberMonths')
      .where('userId', '==', userId)
      .where('status', '==', 'unpaid')
      .orderBy('month', 'asc')
      .get()

    const unpaidMonths = memberMonthsSnap.docs
      .map(d => d.data().month as string)
      .sort()

    for (let i = 0; i < months.length; i++) {
      if (months[i] !== unpaidMonths[i]) {
        return NextResponse.json(
          { error: 'Must pay oldest unpaid months first. No skipping allowed.' },
          { status: 400 }
        )
      }
    }

    // ── Amount in kobo (Paystack uses lowest currency unit) ──────
    const amount = months.length * MONTHLY_CONTRIBUTION * 100  // kobo

    // ── Call Paystack Initialize Transaction ─────────────────────
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        metadata: {
          userId,
          userName,
          months,
          monthCount: months.length,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/verify`,
      }),
    })

    const paystackData = await paystackRes.json()
    if (!paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Paystack initialization failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      paymentUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      amount: months.length * MONTHLY_CONTRIBUTION,
    })
  } catch (error: any) {
    console.error('[/api/payments/initiate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
