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
import { IconStack2, IconMapPin } from '@tabler/icons-react'

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

interface MentionBatchResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  totalMentionsFound: number
  totalMentionsCreated: number
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
  const [mentionResult, setMentionResult] = useState<MentionBatchResult | null>(null)
  
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
      const hasAISteps = data.steps.length > 0
      const hasMentions = data.detectMentions

      let allEntries: AffectedEntry[] = []

      // Fetch AI pipeline preview if steps selected
      if (hasAISteps) {
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
        allEntries = result.entries || []
      }

      // Fetch mention preview if selected
      if (hasMentions) {
        const res = await fetch('/api/batch/mentions/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateFrom: data.dateFrom,
            dateTo: data.dateTo,
            typeCodes: data.typeCodes,
          }),
          credentials: 'same-origin',
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Mention-Vorschau fehlgeschlagen')
        }

        const mentionResult = await res.json()
        const mentionEntries = (mentionResult.entries || []).map((e: { id: string; title: string | null; date: string; existingMentionCount: number }) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          existingMentionCount: e.existingMentionCount,
        }))

        // Merge entries (deduplicate by id)
        const existingIds = new Set(allEntries.map(e => e.id))
        for (const entry of mentionEntries) {
          if (!existingIds.has(entry.id)) {
            allEntries.push(entry)
          }
        }
      }

      setPreviewEntries(allEntries)
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
    setMentionResult(null)

    const hasAISteps = formData.steps.length > 0
    const hasMentions = formData.detectMentions

    try {
      // Start progress simulation (since we don't have real-time updates)
      const progressInterval = setInterval(() => {
        setProgressCurrent(prev => Math.min(prev + 1, previewEntries.length - 1))
      }, 2000)

      // Update current entry info
      if (previewEntries.length > 0) {
        setCurrentTitle(previewEntries[0].title)
        setCurrentStep(hasAISteps ? formData.steps[0] : 'mentions')
      }

      let aiResult: BatchResult | null = null
      let mentionRes: MentionBatchResult | null = null

      // Run AI pipeline if steps selected
      if (hasAISteps) {
        const res = await fetch('/api/batch/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          credentials: 'same-origin',
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'KI-Verarbeitung fehlgeschlagen')
        }

        aiResult = await res.json()
      }

      // Run mention detection if selected
      if (hasMentions) {
        setCurrentStep('mentions')
        const res = await fetch('/api/batch/mentions/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateFrom: formData.dateFrom,
            dateTo: formData.dateTo,
            typeCodes: formData.typeCodes,
          }),
          credentials: 'same-origin',
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Mention-Erkennung fehlgeschlagen')
        }

        mentionRes = await res.json()
        setMentionResult(mentionRes)
      }

      clearInterval(progressInterval)

      // Combine results
      const totalProcessed = (aiResult?.totalProcessed || 0) + (mentionRes?.totalProcessed || 0)
      const totalSuccess = (aiResult?.successCount || 0) + (mentionRes?.successCount || 0)
      const totalError = (aiResult?.errorCount || 0) + (mentionRes?.errorCount || 0)

      // Use AI result as primary, or create empty result if only mentions
      const finalResult: BatchResult = aiResult || {
        totalProcessed: mentionRes?.totalProcessed || 0,
        successCount: mentionRes?.successCount || 0,
        errorCount: mentionRes?.errorCount || 0,
        totalTokensUsed: 0,
        results: [],
      }

      setBatchResult(finalResult)
      setProgressCurrent(totalProcessed)
      setSuccessCount(totalSuccess)
      setErrorCount(totalError)
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
    setMentionResult(null)
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
        <a href="/batch/geocode" className="btn btn-outline btn-sm gap-2 mt-2">
          <IconMapPin size={16} />
          Batch-Geocoding für GPS-Punkte
        </a>
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

      {state === 'results' && (batchResult || mentionResult) && (
        <>
          <BatchResults
            totalProcessed={batchResult?.totalProcessed || mentionResult?.totalProcessed || 0}
            successCount={batchResult?.successCount || mentionResult?.successCount || 0}
            errorCount={batchResult?.errorCount || mentionResult?.errorCount || 0}
            totalTokensUsed={batchResult?.totalTokensUsed || 0}
            results={batchResult?.results || []}
            onReset={handleReset}
          />
          {mentionResult && (
            <div className="card bg-base-200 p-4 mt-4">
              <h3 className="font-medium mb-2">Mention-Erkennung</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Einträge verarbeitet:</span>
                  <span className="ml-2 font-medium">{mentionResult.totalProcessed}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Mentions gefunden:</span>
                  <span className="ml-2 font-medium">{mentionResult.totalMentionsFound}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Neue Mentions erstellt:</span>
                  <span className="ml-2 font-medium text-success">{mentionResult.totalMentionsCreated}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Bereits vorhanden:</span>
                  <span className="ml-2 font-medium">{mentionResult.totalMentionsFound - mentionResult.totalMentionsCreated}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
