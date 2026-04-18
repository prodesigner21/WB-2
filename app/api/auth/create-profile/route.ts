/**
 * app/api/auth/create-profile/route.ts
 *
 * Called immediately after Firebase Auth creates a new user client-side.
 * Creates the Firestore user document using Admin SDK — bypasses all security rules.
 *
 * WHY THIS EXISTS:
 * The client-side Firestore write was silently hanging because:
 *  1. New Firestore databases default to locked mode (deny all)
 *  2. Security rules helper functions tried to read a non-existent doc on first write
 *  3. Firestore errors don't have .code like Auth errors, so they were swallowed
 *
 * This route is authenticated — the user must provide their Firebase ID token.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    // ── Verify the Firebase Auth token ───────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized — missing token' }, { status: 401 })
    }

    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { name, phone, joinedMonth } = await req.json()

    // ── Validate inputs ──────────────────────────────────────────
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!phone || phone.trim().length < 7) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    // ── Check if profile already exists (idempotent) ─────────────
    const existing = await adminDb.collection('users').doc(decoded.uid).get()
    if (existing.exists) {
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // ── Write profile via Admin SDK ──────────────────────────────
    await adminDb.collection('users').doc(decoded.uid).set({
      name: name.trim(),
      email: decoded.email || '',
      phone: phone.trim(),
      role: 'pending',
      sharePercent: 0,
      joinedMonth: joinedMonth || new Date().toISOString().slice(0, 7),
      contractAccepted: true,
      isActive: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[/api/auth/create-profile]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    )
  }
}
