/**
 * app/api/apply/route.ts
 * Public endpoint — no auth required.
 * Writes membership applications via Admin SDK, bypassing client Firestore rules.
 * This is why the apply page was hanging: the client SDK hit the catch-all DENY rule.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

// Very basic email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Phone: allow +, digits, spaces, dashes — at least 7 digits
const PHONE_RE = /^[+\d\s\-()]{7,20}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, reason, contractAccepted } = body

    // ── Server-side validation ───────────────────────────────────
    const errors: Record<string, string> = {}

    if (!name || name.trim().length < 2)
      errors.name = 'Full name must be at least 2 characters.'
    if (!email || !EMAIL_RE.test(email.trim()))
      errors.email = 'Please enter a valid email address.'
    if (!phone || !PHONE_RE.test(phone.trim()))
      errors.phone = 'Please enter a valid phone number (e.g. +234 800 000 0000).'
    if (!reason || reason.trim().length < 20)
      errors.reason = 'Please write at least 20 characters explaining your interest.'
    if (!contractAccepted)
      errors.contract = 'You must accept the membership contract.'

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 })
    }

    // ── Check for duplicate email ────────────────────────────────
    const existing = await adminDb
      .collection('applications')
      .where('email', '==', email.trim().toLowerCase())
      .get()

    if (!existing.empty) {
      return NextResponse.json(
        { errors: { email: 'An application with this email already exists.' } },
        { status: 409 }
      )
    }

    // ── Write to Firestore via Admin SDK ─────────────────────────
    const ref = adminDb.collection('applications').doc()
    await ref.set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      reason: reason.trim(),
      contractAccepted: true,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error: any) {
    console.error('[/api/apply]', error)
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
