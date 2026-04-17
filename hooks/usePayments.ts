/**
 * hooks/usePayments.ts
 * Handles payment initiation with Paystack and state tracking.
 */
'use client'
import { useState, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import type { MemberMonth } from '@/lib/types'

export function usePayments(userId: string) {
  const [initiating, setInitiating] = useState(false)
  const [verifying, setVerifying] = useState(false)

  /**
   * Initiate a Paystack payment for selected months.
   * Returns a payment URL to redirect to, or null on failure.
   */
  const initiatePayment = useCallback(async (
    months: string[],
    email: string,
    userName: string
  ) => {
    if (months.length === 0) {
      toast.error('Select at least one month to pay.')
      return null
    }
    setInitiating(true)
    try {
      const response = await axios.post('/api/payments/initiate', {
        userId,
        months,
        email,
        userName,
      })
      const { paymentUrl, reference } = response.data
      // Open Paystack in a popup (or redirect)
      window.location.href = paymentUrl
      return reference
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to initiate payment.'
      toast.error(msg)
      return null
    } finally {
      setInitiating(false)
    }
  }, [userId])

  /**
   * Verify payment after Paystack callback.
   */
  const verifyPayment = useCallback(async (reference: string) => {
    setVerifying(true)
    try {
      const response = await axios.post('/api/payments/verify', { reference, userId })
      toast.success('Payment submitted! Awaiting admin approval.')
      return response.data
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment verification failed.'
      toast.error(msg)
      return null
    } finally {
      setVerifying(false)
    }
  }, [userId])

  return { initiatePayment, verifyPayment, initiating, verifying }
}
