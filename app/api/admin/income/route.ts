/**
 * app/api/admin/income/route.ts
 * Admin: add income records.
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { source, amount, description } = await req.json()
    if (!source || !amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid income data' }, { status: 400 })
    }

    const ref = adminDb.collection('income').doc()
    await ref.set({
      source,
      amount: parseFloat(amount),
      description: description || '',
      addedBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
    })

    await adminDb.collection('auditLogs').add({
      action: 'income_added',
      performedBy: decoded.uid,
      targetId: ref.id,
      details: `Income added: ₦${parseFloat(amount).toLocaleString()} from "${source}"`,
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error: any) {
    console.error('[/api/admin/income]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
