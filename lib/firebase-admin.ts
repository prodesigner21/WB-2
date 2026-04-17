/**
 * lib/firebase-admin.ts
 * Firebase Admin SDK — SERVER ONLY.
 * Used in API routes for privileged operations.
 * NEVER import this in client-side code.
 */
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App

function getAdminApp(): App {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Replace literal \n in env var with actual newlines
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    adminApp = getApps()[0]
  }
  return adminApp
}

export const adminDb = getFirestore(getAdminApp())
export const adminAuth = getAuth(getAdminApp())
