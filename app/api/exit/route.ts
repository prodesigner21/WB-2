/**
 * app/api/exit/route.ts
 * Member: submit exit request with auto-calculated payout.
 * Admin: approve or reject exit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const EXIT_FEE = 0.075

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    const { action, userId, reason, exitRequestId, rejectionReason } = await req.json()

    // ── MEMBER: Submit exit request ─────────────────────────────
    if (action === 'submit') {
      if (decoded.uid !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Check for existing pending exit request
      const existing = await adminDb
        .collection('exitRequests')
        .where('userId', '==', userId)
        .where('status', '==', 'pending')
        .get()
      if (!existing.empty) {
        return NextResponse.json({ error: 'You already have a pending exit request' }, { status: 400 })
      }

      // Calculate total contributions
      const contribSnap = await adminDb
        .collection('contributions')
        .where('userId', '==', userId)
        .get()
      const totalContributions = contribSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)

      // Calculate income share
      const incomeSnap = await adminDb.collection('income').get()
      const totalIncome = incomeSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const sharePercent = userDoc.data()?.sharePercent || 0
      const profitShare = (totalIncome * sharePercent) / 100

      // Exit calculation
      const gross = totalContributions + profitShare
      const exitFee = gross * EXIT_FEE
      const finalPayout = gross - exitFee

      const ref = adminDb.collection('exitRequests').doc()
      await ref.set({
        userId,
        userName: userDoc.data()?.name || 'Unknown',
        totalContributions,
        profitShare,
        exitFee,
        finalPayout,
        reason: reason || '',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        id: ref.id,
        totalContributions,
        profitShare,
        exitFee,
        finalPayout,
      })
    }

    // ── ADMIN: Approve or reject exit ────────────────────────────
    if (action === 'approve' || action === 'reject') {
      const adminDoc = await adminDb.collection('users').doc(decoded.uid).get()
      if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const exitRef = adminDb.collection('exitRequests').doc(exitRequestId)
      const exitSnap = await exitRef.get()
      if (!exitSnap.exists) {
        return NextResponse.json({ error: 'Exit request not found' }, { status: 404 })
      }

      const exit = exitSnap.data()!
      const batch = adminDb.batch()

      if (action === 'approve') {
        batch.update(exitRef, {
          status: 'approved',
          reviewedBy: decoded.uid,
          reviewedAt: FieldValue.serverTimestamp(),
        })

        // Deactivate member
        batch.update(adminDb.collection('users').doc(exit.userId), {
          isActive: false,
          role: 'exited',
          updatedAt: FieldValue.serverTimestamp(),
        })

        // Record withdrawal for payout
        const wRef = adminDb.collection('withdrawals').doc()
        batch.set(wRef, {
          amount: exit.finalPayout,
          type: 'exit',
          reason: `Exit payout for ${exit.userName}`,
          memberId: exit.userId,
          memberName: exit.userName,
          createdBy: decoded.uid,
          createdAt: FieldValue.serverTimestamp(),
        })

        // Audit
        const auditRef = adminDb.collection('auditLogs').doc()
        batch.set(auditRef, {
          action: 'exit_approved',
          performedBy: decoded.uid,
          targetId: exitRequestId,
          details: `Exit approved for ${exit.userName}. Payout: ₦${exit.finalPayout.toLocaleString()}`,
          timestamp: FieldValue.serverTimestamp(),
        })

        await batch.commit()

        // Recalculate shares after member exits
        const remainingSnap = await adminDb
          .collection('users')
          .where('isActive', '==', true)
          .get()
        const count = remainingSnap.size
        if (count > 0) {
          const newShare = parseFloat((100 / count).toFixed(4))
          const shareBatch = adminDb.batch()
          remainingSnap.forEach(doc => shareBatch.update(doc.ref, { sharePercent: newShare }))
          await shareBatch.commit()
        }

      } else {
        batch.update(exitRef, {
          status: 'rejected',
          rejectionReason: rejectionReason || 'Rejected by admin',
          reviewedBy: decoded.uid,
          reviewedAt: FieldValue.serverTimestamp(),
        })

        const auditRef = adminDb.collection('auditLogs').doc()
        batch.set(auditRef, {
          action: 'exit_rejected',
          performedBy: decoded.uid,
          targetId: exitRequestId,
          details: `Exit rejected for ${exit.userName}.`,
          timestamp: FieldValue.serverTimestamp(),
        })

        await batch.commit()
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('[/api/exit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
