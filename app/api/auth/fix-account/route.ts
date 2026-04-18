/**
 * app/api/auth/fix-account/route.ts
 *
 * Diagnoses and fixes the most common account issues:
 *  1. Profile document missing entirely (never got created)
 *  2. Document exists but with wrong ID (email used as ID instead of UID)
 *  3. Document exists but has empty/missing fields
 *  4. Role is correct in Firestore but getDocFromServer still returns pending
 *
 * Uses Admin SDK — bypasses all Firestore security rules.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    // ── Verify auth token ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    } catch {
      return NextResponse.json({ error: 'Invalid token. Please log out and back in.' }, { status: 401 })
    }

    const uid = decoded.uid
    const email = decoded.email || ''

    const diagnosis: string[] = []
    let finalRole = 'pending'
    let fixed = false

    // ── Step 1: Check if doc exists by UID ──────────────────────
    const byUid = await adminDb.collection('users').doc(uid).get()

    if (byUid.exists) {
      const data = byUid.data()!
      diagnosis.push(`✓ Profile document found by UID (${uid})`)
      diagnosis.push(`  role: "${data.role}", isActive: ${data.isActive}, name: "${data.name || '(empty)'}"`)
      finalRole = data.role

      // Fix empty fields if needed
      const updates: Record<string, any> = {}
      if (!data.email && email) updates.email = email
      if (!data.name) updates.name = email.split('@')[0] // fallback name
      if (!data.phone) updates.phone = ''
      if (!data.joinedMonth) updates.joinedMonth = new Date().toISOString().slice(0, 7)
      if (data.isActive === undefined) updates.isActive = data.role === 'admin'

      if (Object.keys(updates).length > 0) {
        await adminDb.collection('users').doc(uid).update({
          ...updates,
          updatedAt: FieldValue.serverTimestamp(),
        })
        diagnosis.push(`✓ Fixed empty fields: ${Object.keys(updates).join(', ')}`)
        fixed = true
      }

    } else {
      diagnosis.push(`✗ No profile found by UID (${uid})`)

      // ── Step 2: Search by email — maybe doc has wrong ID ──────
      const byEmail = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get()

      if (!byEmail.empty) {
        const wrongDoc = byEmail.docs[0]
        const wrongData = wrongDoc.data()
        diagnosis.push(`✓ Found profile by email with wrong ID: "${wrongDoc.id}"`)
        diagnosis.push(`  role in that doc: "${wrongData.role}"`)
        finalRole = wrongData.role

        // Create correct document under proper UID
        await adminDb.collection('users').doc(uid).set({
          name: wrongData.name || email.split('@')[0],
          email: email,
          phone: wrongData.phone || '',
          role: wrongData.role,
          sharePercent: wrongData.sharePercent || (wrongData.role === 'admin' ? 100 : 0),
          joinedMonth: wrongData.joinedMonth || new Date().toISOString().slice(0, 7),
          contractAccepted: wrongData.contractAccepted || true,
          isActive: wrongData.isActive || (wrongData.role === 'admin'),
          migratedFrom: wrongDoc.id,
          createdAt: wrongData.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })

        // Remove the wrong-ID document
        await wrongDoc.ref.delete()
        diagnosis.push(`✓ Migrated profile to correct UID and removed stale document`)
        fixed = true

      } else {
        // ── Step 3: No profile at all — check if they should be admin
        diagnosis.push('✗ No profile found by email either')

        // Check if this email matches any admin in any doc
        const anyAdmin = await adminDb
          .collection('users')
          .where('role', '==', 'admin')
          .get()

        const matchingAdmin = anyAdmin.docs.find(d =>
          d.data().email?.toLowerCase() === email.toLowerCase()
        )

        if (matchingAdmin) {
          finalRole = 'admin'
          diagnosis.push(`✓ Found admin record with matching email under ID: "${matchingAdmin.id}"`)
          // Copy to correct UID
          const adminData = matchingAdmin.data()
          await adminDb.collection('users').doc(uid).set({
            ...adminData,
            email,
            isActive: true,
            migratedFrom: matchingAdmin.id,
            updatedAt: FieldValue.serverTimestamp(),
          })
          await matchingAdmin.ref.delete()
          diagnosis.push('✓ Migrated admin profile to correct UID')
          fixed = true
        } else {
          // Create fresh pending profile
          await adminDb.collection('users').doc(uid).set({
            name: email.split('@')[0],
            email,
            phone: '',
            role: 'pending',
            sharePercent: 0,
            joinedMonth: new Date().toISOString().slice(0, 7),
            contractAccepted: true,
            isActive: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })
          diagnosis.push('✓ Created fresh pending profile (no existing data found)')
          fixed = true
        }
      }
    }

    // ── Final: read back the corrected profile ───────────────────
    const finalDoc = await adminDb.collection('users').doc(uid).get()
    const finalData = finalDoc.data()

    return NextResponse.json({
      success: true,
      fixed,
      diagnosis,
      profile: {
        uid,
        email: finalData?.email,
        name: finalData?.name,
        role: finalData?.role,
        isActive: finalData?.isActive,
      },
    })

  } catch (error: any) {
    console.error('[/api/auth/fix-account]', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
