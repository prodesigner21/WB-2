/**
 * store/authStore.ts
 * Global auth state using Zustand.
 * Tracks Firebase user + Firestore profile + role.
 */
import { create } from 'zustand'
import { User } from 'firebase/auth'
import type { UserProfile } from '@/lib/types'

interface AuthState {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean

  // Actions
  setFirebaseUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  profile: null,
  loading: true,
  initialized: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ firebaseUser: null, profile: null, loading: false }),
}))
