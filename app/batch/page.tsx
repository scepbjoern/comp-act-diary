/**
 * Batch Processing Page - Allows batch processing of multiple journal entries.
 * Implements a state machine: Filter → Preview → Progress → Results
 */

'use client'

import { useState, useCallback } from 'react'
import { BatchFilterForm, type BatchFilterFormData } from '@/components/BatchFilterForm'
import { BatchPreview, type AffectedEntry } from '@/components/BatchPreview'
import { BatchProgress } from '@/components/BatchProgress'
import { BatchResults } from '@/components/BatchResults'
import { IconStack2 } from '@tabler/icons-react'

// =============================================================================
// TYPES
// =============================================================================

type PageState = 'filter' | 'preview' | 'progress' | 'results'

interface BatchEntryResult {
  entryId: string
  entryTitle: string | null
  entryDate: string
  success: boolean
  stepsRun: string[]
  error?: string
}

interface BatchResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  totalTokensUsed: number
  results: BatchEntryResult[]
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function BatchPage() {
  const [state, setState] = useState<PageState>('filter')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<BatchFilterFormData | null>(null)
  const [previewEntries, setPreviewEntries] = useState<AffectedEntry[]>([])
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  
  // Progress tracking
  const [progressCurrent, setProgressCurrent] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [currentTitle, setCurrentTitle] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  // Handle preview request (dry-run)
  const handlePreview = useCallback(async (data: BatchFilterFormData) => {
    setIsLoading(true)
    setFormData(data)

    try {
      const res = await fetch('/api/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Vorschau fehlgeschlagen')
      }

      const result = await res.json()
      setPreviewEntries(result.entries || [])
      setState('preview')
    } catch (e) {
      console.error('Preview failed:', e)
      alert(e instanceof Error ? e.message : 'Vorschau fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle batch run
  const handleRun = useCallback(async () => {
    if (!formData) return

    setIsLoading(true)
    setState('progress')
    setProgressCurrent(0)
    setProgressTotal(previewEntries.length)
    setSuccessCount(0)
    setErrorCount(0)

    try {
      // Start progress simulation (since we don't have real-time updates)
      const progressInterval = setInterval(() => {
        setProgressCurrent(prev => Math.min(prev + 1, previewEntries.length - 1))
      }, 2000)

      // Update current entry info
      if (previewEntries.length > 0) {
        setCurrentTitle(previewEntries[0].title)
        setCurrentStep(formData.steps[0])
      }

      const res = await fetch('/api/batch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'same-origin',
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Verarbeitung fehlgeschlagen')
      }

      const result: BatchResult = await res.json()
      setBatchResult(result)
      setProgressCurrent(result.totalProcessed)
      setSuccessCount(result.successCount)
      setErrorCount(result.errorCount)
      setState('results')
    } catch (e) {
      console.error('Batch run failed:', e)
      alert(e instanceof Error ? e.message : 'Verarbeitung fehlgeschlagen')
      setState('preview')
    } finally {
      setIsLoading(false)
    }
  }, [formData, previewEntries])

  // Reset to filter state
  const handleReset = useCallback(() => {
    setState('filter')
    setFormData(null)
    setPreviewEntries([])
    setBatchResult(null)
    setProgressCurrent(0)
    setProgressTotal(0)
    setCurrentTitle(null)
    setCurrentStep(null)
    setSuccessCount(0)
    setErrorCount(0)
  }, [])

  // Go back to filter
  const handleBack = useCallback(() => {
    setState('filter')
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <IconStack2 size={32} className="text-primary" />
          <h1 className="text-2xl font-bold">Batch-Verarbeitung</h1>
        </div>
        <p className="text-base-content/70">
          Mehrere Journal-Einträge auf einmal mit KI verarbeiten
        </p>
      </div>

      {/* State Machine */}
      {state === 'filter' && (
        <BatchFilterForm onPreview={handlePreview} isLoading={isLoading} />
      )}

      {state === 'preview' && (
        <BatchPreview
          entries={previewEntries}
          onBack={handleBack}
          onRun={handleRun}
          isRunning={isLoading}
        />
      )}

      {state === 'progress' && (
        <BatchProgress
          current={progressCurrent}
          total={progressTotal}
          currentTitle={currentTitle}
          currentStep={currentStep}
          successCount={successCount}
          errorCount={errorCount}
        />
      )}

      {state === 'results' && batchResult && (
        <BatchResults
          totalProcessed={batchResult.totalProcessed}
          successCount={batchResult.successCount}
          errorCount={batchResult.errorCount}
          totalTokensUsed={batchResult.totalTokensUsed}
          results={batchResult.results}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
