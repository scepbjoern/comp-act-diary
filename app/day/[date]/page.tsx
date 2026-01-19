"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Redirect route for direct date navigation.
 * URLs like /day/2025-11-30 will void redirect to the home page with the date in session storage.
 */
export default function DayRedirectPage({ params }: { params: Promise<{ date: string }> }) {
  const router = useRouter()

  useEffect(() => {
    void params.then(({ date }) => {
      // Validate date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Store the target date in sessionStorage so the home page can pick it up
        sessionStorage.setItem('navigateToDate', date)
      }
      // Redirect to home page
      router.replace('/')
    })
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <span className="loading loading-spinner loading-lg" />
    </div>
  )
}
