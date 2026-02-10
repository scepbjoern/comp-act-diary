/**
 * components/features/journal/PipelineStepModal.tsx
 * Modal to let the user select which AI pipeline steps to run.
 * All steps are checked by default. Uses native HTML checkboxes.
 */

'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconSparkles } from '@tabler/icons-react'

// Available pipeline steps with display labels
const PIPELINE_STEPS = [
  { id: 'content', label: 'Textverbesserung' },
  { id: 'summary', label: 'Zusammenfassung' },
  { id: 'title', label: 'Titelgenerierung' },
  { id: 'analysis', label: 'Analyse' },
  { id: 'image', label: 'Bildgenerierung' },
] as const

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]['id']

interface PipelineStepModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (steps: PipelineStepId[]) => void
  /** Whether the pipeline is currently running */
  isRunning?: boolean
}

export function PipelineStepModal({ isOpen, onClose, onConfirm, isRunning = false }: PipelineStepModalProps) {
  // All steps selected by default
  const [selected, setSelected] = useState<Set<PipelineStepId>>(
    new Set(PIPELINE_STEPS.map((s) => s.id))
  )

  const toggleStep = (id: PipelineStepId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selected))
  }

  if (!isOpen) return null

  return createPortal(
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        {/* Close button */}
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
          disabled={isRunning}
        >
          <IconX size={20} />
        </button>

        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <IconSparkles className="h-5 w-5 text-violet-500" />
          KI-Pipeline
        </h3>
        <p className="text-sm text-base-content/60 mb-4">
          Welche Schritte sollen ausgeführt werden?
        </p>

        {/* Step checkboxes – plain HTML checkboxes */}
        <div className="space-y-2">
          {PIPELINE_STEPS.map((step) => (
            <label key={step.id} className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={selected.has(step.id)}
                onChange={() => toggleStep(step.id)}
                disabled={isRunning}
                className="h-4 w-4 rounded border-base-300 accent-primary"
              />
              <span className="text-sm">{step.label}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={isRunning}
          >
            Abbrechen
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={handleConfirm}
            disabled={isRunning || selected.size === 0}
          >
            {isRunning ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Läuft…
              </>
            ) : (
              <>
                <IconSparkles className="h-4 w-4" />
                Ausführen ({selected.size})
              </>
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={isRunning ? undefined : onClose} />
    </div>,
    document.body
  )
}
