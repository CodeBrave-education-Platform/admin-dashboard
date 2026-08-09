'use client'

import React, { useEffect } from 'react'
import { useToast } from './ToastProvider'

export function GlobalModalOverrides({ children }) {
  const { showToast } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert
      window.alert = (message) => {
        const msgStr = String(message).toLowerCase()
        const isError = msgStr.includes('fail') || msgStr.includes('error') || msgStr.includes('required') || msgStr.includes('invalid')
        showToast(message, isError ? 'error' : 'success', 4000)
      }

      return () => {
        window.alert = originalAlert
      }
    }
  }, [showToast])

  return <>{children}</>
}
