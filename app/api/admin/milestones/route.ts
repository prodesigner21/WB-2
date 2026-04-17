/**
 * app/api/admin/milestones/route.ts
 * Admin: create and update roadmap milestones.
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

    const { title, description, targetAmount, targetDate, order } = await req.json()
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
    }

    const ref = adminDb.collection('milestones').doc()
    await ref.set({
      title,
      description,
      targetAmount: targetAmount || 0,
      targetDate: targetDate || null,
      progress: 0,
      status: 'upcoming',
      order: order || 0,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, id: ref.id })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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

    const { milestoneId, progress, status } = await req.json()
    if (!milestoneId) return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })

    const updates: Record<string, any> = {}
    if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, progress))
    if (status) updates.status = status
    if (progress === 100) {
      updates.status = 'completed'
      updates.completedAt = FieldValue.serverTimestamp()
    }

    await adminDb.collection('milestones').doc(milestoneId).update(updates)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
