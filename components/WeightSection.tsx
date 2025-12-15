import { useState, useEffect } from 'react'
import { Icon } from '@/components/Icon'
import type { Day } from '@/types/day'

interface WeightSectionProps {
  day: Day
}

export function WeightSection({ day }: WeightSectionProps) {
  const [weight, setWeight] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Load weight when day changes
  useEffect(() => {
    if (!day?.id) return
    fetch(`/api/day/${day.id}/weight`, { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => {
        if (data.weight !== null && data.weight !== undefined) {
          setWeight(data.weight.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
        } else {
          setWeight('')
        }
      })
      .catch(() => setWeight(''))
  }, [day?.id])

  async function saveWeight() {
    if (!day?.id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/day/${day.id}/weight`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: weight || null }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (data.weight !== null && data.weight !== undefined) {
        setWeight(data.weight.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">
        <span className="inline-flex items-center gap-1">
          <Icon name="⚖️" />
          <span>Körpergewicht (kg)</span>
        </span>
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9.,]*"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          onBlur={saveWeight}
          onKeyDown={e => { if (e.key === 'Enter') saveWeight() }}
          className="w-24 bg-background border border-slate-700 rounded px-2 py-1 text-sm"
          placeholder="z.B. 72,5"
          disabled={saving}
        />
        <span className="text-xs text-gray-400">kg</span>
        {saving && <span className="text-xs text-gray-400">Speichern...</span>}
      </div>
    </div>
  )
}
