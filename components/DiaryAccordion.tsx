"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { TablerIcon } from './TablerIcon'
import { Icon } from './Icon'

type DayEntry = {
  id: string
  date: string
  phase: string
  careCategory: string
  symptoms: Record<string, number>
  stool?: number
  habitTicks: string[]
  userSymptoms: Array<{ symptomId: string; value: number }>
  notes?: Array<{
    id: string
    type: string
    text: string
    occurredAtIso?: string
    photos?: Array<{ id: string; url: string }>
  }>
}

interface DiaryAccordionProps {
  entries: DayEntry[]
  symptomIcons?: Record<string, string>
  habits?: Array<{ id: string; name: string; icon?: string }>
  userSymptoms?: Array<{ id: string; name: string; icon?: string }>
}

export function DiaryAccordion({ entries, symptomIcons, habits, userSymptoms }: DiaryAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  }


  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={entry.id} className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input 
            type="radio" 
            name="diary-accordion" 
            checked={openIndex === index}
            onChange={() => toggleAccordion(index)}
          />
          <div className="collapse-title text-sm font-medium">
            <div className="flex items-center justify-between">
              <span>{formatDate(entry.date)}</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="badge badge-sm badge-outline">Phase {entry.phase.replace('PHASE_', '')}</span>
                <span className="badge badge-sm badge-outline">{entry.careCategory}</span>
              </div>
            </div>
          </div>
          <div className="collapse-content">
            <div className="space-y-4 pt-2">
              {/* Symptoms */}
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                  <TablerIcon name="stethoscope" size={16} />
                  <span>Symptome</span>
                </h4>
                {Object.keys(entry.symptoms).length === 0 ? (
                  <p className="text-xs text-gray-400">Keine Symptome erfasst</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(entry.symptoms).map(([type, value]) => (
                      value > 0 && (
                        <div key={type} className="badge badge-sm gap-1">
                          {symptomIcons?.[type] && <Icon name={symptomIcons[type]} />}
                          <span>{type}: {value}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Stool */}
              {entry.stool !== undefined && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Stuhlgang</h4>
                  <div className="badge badge-sm">Bristol: {entry.stool}</div>
                </div>
              )}

              {/* Habits */}
              {entry.habitTicks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <TablerIcon name="checklist" size={16} />
                    <span>Gewohnheiten</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.habitTicks.map(habitId => {
                      const habit = habits?.find(h => h.id === habitId)
                      return (
                        <div key={habitId} className="badge badge-sm gap-1">
                          {habit?.icon && <Icon name={habit.icon} />}
                          <span>{habit?.name || habitId}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* User Symptoms */}
              {entry.userSymptoms.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Benutzerdefinierte Symptome</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.userSymptoms.map(us => {
                      const symptom = userSymptoms?.find(s => s.id === us.symptomId)
                      return (
                        <div key={us.symptomId} className="badge badge-sm gap-1">
                          {symptom?.icon && <Icon name={symptom.icon} />}
                          <span>{symptom?.name || us.symptomId}: {us.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && entry.notes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <TablerIcon name="edit_note" size={16} />
                    <span>Notizen</span>
                  </h4>
                  <div className="space-y-2">
                    {entry.notes.map(note => (
                      <div key={note.id} className="text-xs bg-base-300 p-2 rounded">
                        {note.occurredAtIso && (
                          <div className="text-gray-400 mb-1">{note.occurredAtIso}</div>
                        )}
                        <div className="whitespace-pre-wrap">{note.text}</div>
                        {note.photos && note.photos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {note.photos.map(photo => (
                              <Image 
                                key={photo.id} 
                                src={`${photo.url}?v=${photo.id}`} 
                                alt="Foto" 
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
