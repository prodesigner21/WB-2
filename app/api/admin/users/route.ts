/**
 * app/api/admin/users/route.ts
 * Admin: approve/reject pending users, recalculate shares, manage members.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)

    const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, targetUserId } = await req.json()

    if (action === 'approve') {
      // ── Approve member ─────────────────────────────────────────
      // Count existing active members
      const membersSnap = await adminDb
        .collection('users')
        .where('role', 'in', ['member', 'admin'])
        .where('isActive', '==', true)
        .get()
      const currentMemberCount = membersSnap.size
      const newTotal = currentMemberCount + 1
      const newShare = parseFloat((100 / newTotal).toFixed(4))

      const batch = adminDb.batch()

      // Update new member
      batch.update(adminDb.collection('users').doc(targetUserId), {
        role: 'member',
        isActive: true,
        sharePercent: newShare,
        approvedBy: decoded.uid,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Recalculate all existing members' shares
      membersSnap.forEach(doc => {
        batch.update(doc.ref, { sharePercent: newShare })
      })

      // Also update admin's share
      batch.update(adminDb.collection('users').doc(decoded.uid), {
        sharePercent: newShare,
      })

      // Create initial memberMonth record for current month
      const nowMonth = format(new Date(), 'yyyy-MM')
      const monthRef = adminDb.collection('memberMonths').doc()
      batch.set(monthRef, {
        userId: targetUserId,
        month: nowMonth,
        status: 'unpaid',
        createdAt: FieldValue.serverTimestamp(),
      })

      // Audit log
      const auditRef = adminDb.collection('auditLogs').doc()
      batch.set(auditRef, {
        action: 'user_approved',
        performedBy: decoded.uid,
        targetId: targetUserId,
        details: `Member approved. New share = ${newShare}% for all ${newTotal} members.`,
        timestamp: FieldValue.serverTimestamp(),
      })

      await batch.commit()
      return NextResponse.json({ success: true, newShare, totalMembers: newTotal })

    } else if (action === 'reject') {
      await adminDb.collection('users').doc(targetUserId).update({
        role: 'rejected',
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      })

      await adminDb.collection('auditLogs').add({
        action: 'user_rejected',
        performedBy: decoded.uid,
        targetId: targetUserId,
        details: 'Member application rejected.',
        timestamp: FieldValue.serverTimestamp(),
      })

      return NextResponse.json({ success: true })

    } else if (action === 'recalculate_shares') {
      // ── Recalculate all shares equally ────────────────────────
      const allActiveSnap = await adminDb
        .collection('users')
        .where('isActive', '==', true)
        .get()
      const count = allActiveSnap.size
      const share = parseFloat((100 / count).toFixed(4))

      const batch = adminDb.batch()
      allActiveSnap.forEach(doc => {
        batch.update(doc.ref, { sharePercent: share })
      })

      const auditRef = adminDb.collection('auditLogs').doc()
      batch.set(auditRef, {
        action: 'shares_recalculated',
        performedBy: decoded.uid,
        details: `Shares recalculated: ${share}% each for ${count} members.`,
        timestamp: FieldValue.serverTimestamp(),
      })

      await batch.commit()
      return NextResponse.json({ success: true, share, count })

    } else if (action === 'add_months') {
      // ── Add upcoming months for all active members ─────────────
      const { month } = await req.json()
      const activeMembers = await adminDb
        .collection('users')
        .where('role', 'in', ['member', 'admin'])
        .where('isActive', '==', true)
        .get()

      const batch = adminDb.batch()
      activeMembers.forEach(doc => {
        const uid = doc.id
        const ref = adminDb.collection('memberMonths').doc()
        batch.set(ref, {
          userId: uid,
          month,
          status: 'unpaid',
          createdAt: FieldValue.serverTimestamp(),
        })
      })
      await batch.commit()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[/api/admin/users]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
