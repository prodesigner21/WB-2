/**
 * hooks/useAuth.ts
 * Central auth hook. Syncs Firebase Auth state with Firestore profile.
 * Returns auth helpers for login, signup, logout.
 */
'use client'
import { useEffect, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfile, createUserProfile } from '@/lib/firestore'
import { useAuthStore } from '@/store/authStore'
import { currentMonth } from '@/utils/calculations'
import type { UserProfile } from '@/lib/types'

export function useAuth() {
  const {
    firebaseUser, profile, loading, initialized,
    setFirebaseUser, setProfile, setLoading, setInitialized, reset
  } = useAuthStore()

  // ── Bootstrap: listen for auth state changes ──────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        const userProfile = await getUserProfile(user.uid)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
      setInitialized(true)
    })
    return () => unsubscribe()
  }, [])

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userProfile = await getUserProfile(cred.user.uid)
      setProfile(userProfile)
      return { success: true, profile: userProfile }
    } catch (error: any) {
      return { success: false, error: mapAuthError(error.code) }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Signup ─────────────────────────────────────────────────────
  const signup = useCallback(async (params: {
    name: string
    email: string
    password: string
    phone: string
  }) => {
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, params.email, params.password)
      const newProfile: Omit<UserProfile, 'id'> = {
        name: params.name,
        email: params.email,
        phone: params.phone,
        role: 'pending',
        sharePercent: 0,
        joinedMonth: currentMonth(),
        contractAccepted: true,
        isActive: false,
        createdAt: null,
        updatedAt: null,
      }
      await createUserProfile(cred.user.uid, newProfile)
      setProfile({ id: cred.user.uid, ...newProfile })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: mapAuthError(error.code) }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth)
    reset()
  }, [])

  // ── Password Reset ─────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: mapAuthError(error.code) }
    }
  }, [])

  // ── Refresh profile ────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return
    const updated = await getUserProfile(firebaseUser.uid)
    setProfile(updated)
  }, [firebaseUser])

  return {
    user: firebaseUser,
    profile,
    loading,
    initialized,
    isAdmin: profile?.role === 'admin',
    isMember: profile?.role === 'member',
    isPending: profile?.role === 'pending',
    isAuthenticated: !!firebaseUser,
    login,
    signup,
    logout,
    resetPassword,
    refreshProfile,
  }
}

// Map Firebase error codes to human-friendly messages
function mapAuthError(code: string): string {
  const errors: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }
  return errors[code] || 'Authentication failed. Please try again.'
}
