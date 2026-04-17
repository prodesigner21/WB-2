/**
 * app/api/setup-admin/route.ts
 * ONE-TIME admin claim endpoint.
 * Only works if:
 *   1. The requesting user is authenticated
 *   2. Zero admin accounts currently exist in Firestore
 * After the first admin is set, this endpoint is permanently locked.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    // ── Must be authenticated ────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)

    // ── Check: does any admin already exist? ─────────────────────
    const existingAdmins = await adminDb
      .collection('users')
      .where('role', '==', 'admin')
      .get()

    if (!existingAdmins.empty) {
      return NextResponse.json(
        { error: 'An admin already exists. This setup route is locked.' },
        { status: 403 }
      )
    }

    // ── Promote this user to admin ───────────────────────────────
    await adminDb.collection('users').doc(decoded.uid).set(
      {
        role: 'admin',
        isActive: true,
        sharePercent: 100, // sole member for now
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true } // keep existing fields like name, email, phone
    )

    // ── Write audit log ──────────────────────────────────────────
    await adminDb.collection('auditLogs').add({
      action: 'first_admin_setup',
      performedBy: decoded.uid,
      details: 'First admin account established via /api/setup-admin.',
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, message: 'Admin role granted. Please log out and log back in.' })
  } catch (error: any) {
    console.error('[/api/setup-admin]', error)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
