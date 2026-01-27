/**
 * Modal for viewing and editing journal entry timestamps.
 * Shows Bezugzeit (editable), Erfassungszeit (editable), and Uploadzeit (read-only).
 */
"use client"
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClock, IconX } from '@tabler/icons-react'

interface TimestampModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (occurredAt: string, capturedAt: string, audioFileId?: string | null) => Promise<void>
  occurredAtIso?: string
  capturedAtIso?: string
  audioCapturedAtIso?: string | null
  audioUploadedAtIso?: string | null
  audioFileId?: string | null
}

function formatDateTimeLocal(isoString?: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDisplayDateTime(isoString?: string | null): string {
  if (!isoString) return '–'
  const d = new Date(isoString)
  return d.toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function TimestampModal({
  isOpen,
  onClose,
  onSave,
  occurredAtIso,
  capturedAtIso,
  audioCapturedAtIso,
  audioUploadedAtIso,
  audioFileId
}: TimestampModalProps) {
  const [occurredAt, setOccurredAt] = useState('')
  const [capturedAt, setCapturedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setOccurredAt(formatDateTimeLocal(occurredAtIso))
      // Use audioCapturedAtIso if available (media entry), otherwise capturedAtIso
      setCapturedAt(formatDateTimeLocal(audioCapturedAtIso || capturedAtIso))
    }
  }, [isOpen, occurredAtIso, capturedAtIso, audioCapturedAtIso])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(
        new Date(occurredAt).toISOString(),
        new Date(capturedAt).toISOString(),
        audioFileId
      )
      onClose()
    } catch (err) {
      console.error('Failed to save timestamps', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <IconClock size={20} />
            Zeitpunkte bearbeiten
          </h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Bezugzeit (Occurrence Time) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Bezugzeit</span>
              <span className="label-text-alt text-gray-500">Sortierung/Anzeige</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          {/* Erfassungszeit (Capture Time) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Erfassungszeit</span>
              <span className="label-text-alt text-gray-500">Erstellung des Inhalts</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
            />
          </div>

          {/* Uploadzeit (read-only, only shown if available) */}
          {audioUploadedAtIso && (
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-500">Uploadzeit</span>
                <span className="label-text-alt text-gray-500">Nur lesbar</span>
              </label>
              <div className="input input-bordered w-full bg-base-200 flex items-center text-gray-400">
                {formatDisplayDateTime(audioUploadedAtIso)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-medium text-gray-400">Bezugzeit:</span> Zeitpunkt, auf den sich der Eintrag inhaltlich bezieht (Tag/Uhrzeit des Ereignisses).
          </p>
          <p>
            <span className="font-medium text-gray-400">Erfassungszeit:</span> Zeitpunkt, an dem der Inhalt erstellt wurde (Text verfasst, Audio aufgenommen, Bild erstellt).
          </p>
          <p>
            <span className="font-medium text-gray-400">Uploadzeit:</span> Zeitpunkt, an dem eine Datei in die App hochgeladen wurde (read-only).
          </p>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving || !occurredAt || !capturedAt}
          >
            {saving ? <span className="loading loading-spinner loading-sm" /> : 'Speichern'}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>,
    document.body
  )
}
