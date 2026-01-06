"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { TablerIcon } from './TablerIcon'
import { MicrophoneButton } from './MicrophoneButton'
import { CameraPicker } from './CameraPicker'
import { AudioPlayerH5 } from './AudioPlayerH5'
import { RichTextEditor } from './RichTextEditor'
import { DiaryContentWithMentions } from './DiaryContentWithMentions'
import { OriginalTranscriptPanel } from './OriginalTranscriptPanel'
import { OCRSourcePanel } from './OCRSourcePanel'
import { JournalEntrySection } from './JournalEntrySection'
import { AISettingsPopup } from './AISettingsPopup'
import { useJournalAI } from '@/hooks/useJournalAI'
import {
  IconSettings,
  IconSparkles,
  IconClipboard,
  IconFileText,
  IconSearch,
} from '@tabler/icons-react'

type DayNote = {
  id: string
  dayId: string
  type: 'MEAL' | 'REFLECTION' | 'DIARY'
  title?: string | null
  time?: string
  techTime?: string
  text: string
  originalTranscript?: string | null
  aiSummary?: string | null
  analysis?: string | null
  contentUpdatedAt?: string | null
  audioFilePath?: string | null
  audioFileId?: string | null
  keepAudio?: boolean
  photos?: { id: string; url: string }[]
  occurredAtIso?: string
  createdAtIso?: string
}

interface DiaryEntriesAccordionProps {
  notes: DayNote[]
  editingNoteId: string | null
  editingText: string
  editingTime: string
  editingTitle: string
  onEdit: (note: DayNote) => void
  onSave: (id: string) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onTextChange: (text: string) => void
  onTimeChange: (time: string) => void
  onTitleChange: (title: string) => void
  onUploadPhotos: (id: string, files: FileList | File[]) => void
  onDeletePhoto: (id: string) => void
  onViewPhoto: (noteId: string, index: number, url?: string) => void
  onDeleteAudio?: (id: string) => void
  onRetranscribe?: (noteId: string, newText: string) => void
  onUpdateContent?: (noteId: string, newContent: string) => void
  onRefreshNotes?: () => void
}

export function DiaryEntriesAccordion({
  notes,
  editingNoteId,
  editingText,
  editingTime,
  editingTitle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onTextChange,
  onTimeChange,
  onTitleChange,
  onUploadPhotos,
  onDeletePhoto,
  onViewPhoto,
  onDeleteAudio,
  onRetranscribe,
  onUpdateContent,
  onRefreshNotes
}: DiaryEntriesAccordionProps) {
  const [settingsPopupNoteId, setSettingsPopupNoteId] = useState<string | null>(null)
  const [loadingStates, setLoadingStates] = useState<Record<string, 'content' | 'analysis' | 'summary' | 'pipeline' | null>>({})
  
  const { generateContent, generateAnalysis, generateSummary, runPipeline } = useJournalAI()

  const fmtHMLocal = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  const extractImageUrls = (text: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    const urls: string[] = []
    let match
    while ((match = imageRegex.exec(text)) !== null) {
      urls.push(match[1])
    }
    return urls
  }

  const handleRunPipeline = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'pipeline' }))
    await runPipeline(noteId)
    
    // Also generate title after pipeline
    const note = notes.find(n => n.id === noteId)
    if (note?.text?.trim()) {
      try {
        const res = await fetch('/api/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: note.text, model: 'gpt-4o-mini' })
        })
        const data = await res.json()
        if (data.title) {
          await fetch(`/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: data.title })
          })
        }
      } catch (e) {
        console.error('Title generation in pipeline failed', e)
      }
    }
    
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateContent = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'content' }))
    await generateContent(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateAnalysis = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'analysis' }))
    await generateAnalysis(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleGenerateSummary = async (noteId: string) => {
    setLoadingStates(prev => ({ ...prev, [noteId]: 'summary' }))
    await generateSummary(noteId)
    setLoadingStates(prev => ({ ...prev, [noteId]: null }))
    onRefreshNotes?.()
  }

  const handleDeleteAnalysis = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}/analysis`, { method: 'DELETE' })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to delete analysis', err)
    }
  }

  const handleDeleteSummary = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: null })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to delete summary', err)
    }
  }

  const handleUpdateAnalysis = async (noteId: string, newAnalysis: string) => {
    try {
      await fetch(`/api/notes/${noteId}/analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: newAnalysis })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to update analysis', err)
    }
  }

  const handleUpdateSummary = async (noteId: string, newSummary: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiSummary: newSummary })
      })
      onRefreshNotes?.()
    } catch (err) {
      console.error('Failed to update summary', err)
    }
  }

  const diaryNotes = notes.filter(n => n.type === 'DIARY').sort((a, b) => 
    (b.occurredAtIso || '').localeCompare(a.occurredAtIso || '')
  )

  if (diaryNotes.length === 0) {
    return <div className="text-sm text-gray-400">Noch keine Tagebucheinträge.</div>
  }

  return (
    <div className="space-y-2">
      {diaryNotes.map(n => {
        const noteLoading = loadingStates[n.id]
        const isOutdated = n.contentUpdatedAt && n.analysis && 
          new Date(n.contentUpdatedAt) > new Date(n.createdAtIso || 0)
        
        return (
          <div key={n.id} className="collapse collapse-arrow bg-base-200 border-2 border-slate-600">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title text-sm font-medium py-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{fmtHMLocal(n.occurredAtIso)}</span>
                <span className="text-gray-300 truncate">
                  {n.title || n.text.substring(0, 100) || 'Tagebucheintrag'}
                </span>
              </div>
            </div>
            <div className="collapse-content">
              <div className="pt-2 space-y-3 text-sm">
                {/* Action bar with AI controls */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    {editingNoteId === n.id ? (
                      <>
                        <button 
                          className="btn btn-success btn-xs" 
                          onClick={() => onSave(n.id)}
                          title="Speichern"
                        >
                          <TablerIcon name="device-floppy" size={16} />
                          <span className="md:inline hidden ml-1">Speichern</span>
                        </button>
                        <button 
                          className="btn btn-ghost btn-xs" 
                          onClick={onCancel}
                          title="Abbrechen"
                        >
                          <TablerIcon name="cancel" size={16} />
                          <span className="md:inline hidden ml-1">Abbrechen</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-ghost btn-xs" 
                          title="Bearbeiten" 
                          onClick={() => onEdit(n)}
                        >
                          <TablerIcon name="edit" size={16} />
                          <span className="md:inline hidden ml-1">Bearbeiten</span>
                        </button>
                        <button 
                          className="btn btn-ghost btn-xs text-red-400" 
                          title="Löschen" 
                          onClick={() => onDelete(n.id)}
                        >
                          <TablerIcon name="trash" size={16} />
                          <span className="md:inline hidden ml-1">Löschen</span>
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* AI action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setSettingsPopupNoteId(n.id)}
                      title="AI-Einstellungen"
                    >
                      <IconSettings size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-primary"
                      onClick={() => handleRunPipeline(n.id)}
                      disabled={noteLoading === 'pipeline'}
                      title="AI-Pipeline ausführen (Content → Analyse → Zusammenfassung)"
                    >
                      {noteLoading === 'pipeline' ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <IconSparkles size={16} />
                      )}
                      <span className="md:inline hidden ml-1">AI-Pipeline</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={async () => {
                        if (!editingText.trim() && !n.text.trim()) return
                        try {
                          const res = await fetch('/api/generate-title', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: editingNoteId === n.id ? editingText : n.text, model: 'gpt-4o-mini' })
                          })
                          const data = await res.json()
                          if (data.title) {
                            if (editingNoteId === n.id) {
                              onTitleChange(data.title)
                            } else {
                              // Save title directly
                              await fetch(`/api/notes/${n.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ title: data.title })
                              })
                              onRefreshNotes?.()
                            }
                          }
                        } catch (e) {
                          console.error('Title generation failed', e)
                        }
                      }}
                      title="Titel generieren"
                    >
                      ✨
                    </button>
                  </div>
                </div>

                {/* AI Summary Section (blue background) */}
                <JournalEntrySection
                  title="Zusammenfassung"
                  icon={<IconClipboard size={16} className="text-info" />}
                  content={n.aiSummary || null}
                  bgColorClass="bg-blue-500/10 rounded-lg px-2"
                  isEmpty={!n.aiSummary}
                  isLoading={noteLoading === 'summary'}
                  canDelete={true}
                  canGenerate={true}
                  onEdit={(newSummary) => handleUpdateSummary(n.id, newSummary)}
                  onDelete={() => handleDeleteSummary(n.id)}
                  onGenerate={() => handleGenerateSummary(n.id)}
                  onRegenerate={() => handleGenerateSummary(n.id)}
                />
                
                {/* Content Section */}
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Titel</span>
                      <input 
                        type="text" 
                        value={editingTitle} 
                        onChange={e => onTitleChange(e.target.value)} 
                        placeholder="Optional: Titel für Eintrag"
                        className="flex-1 bg-background border border-slate-700 rounded px-2 py-1 text-xs" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Zeit</span>
                      <input 
                        type="time" 
                        value={editingTime} 
                        onChange={e => onTimeChange(e.target.value)} 
                        className="bg-background border border-slate-700 rounded px-2 py-1 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <RichTextEditor
                        markdown={editingText}
                        onChange={onTextChange}
                        placeholder="Tagebucheintrag bearbeiten..."
                      />
                      <div className="flex items-center gap-2">
                        <MicrophoneButton
                          onText={(t: string) => onTextChange(editingText ? (editingText + ' ' + t) : t)}
                          className="text-gray-300 hover:text-gray-100 text-xs"
                          compact
                        />
                        {n.originalTranscript && (
                          <button
                            className="btn btn-ghost btn-xs text-primary"
                            onClick={() => handleGenerateContent(n.id)}
                            disabled={noteLoading === 'content'}
                            title="Text mit KI verbessern"
                          >
                            {noteLoading === 'content' ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <IconSparkles size={14} />
                            )}
                            <span className="ml-1">Verbessern</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <JournalEntrySection
                    title="Inhalt"
                    icon={<IconFileText size={16} />}
                    content={n.text}
                    isEmpty={!n.text}
                    isLoading={noteLoading === 'content'}
                    canDelete={false}
                    canGenerate={!!n.originalTranscript}
                    onEdit={(newContent) => onUpdateContent?.(n.id, newContent)}
                    onGenerate={() => handleGenerateContent(n.id)}
                    onRegenerate={() => handleGenerateContent(n.id)}
                  >
                    <DiaryContentWithMentions noteId={n.id} markdown={n.text} />
                  </JournalEntrySection>
                )}
                
                {/* Analysis Section (yellow background) */}
                <JournalEntrySection
                  title="Analyse"
                  icon={<IconSearch size={16} className="text-warning" />}
                  content={n.analysis || null}
                  bgColorClass="bg-yellow-500/10 rounded-lg px-2"
                  isEmpty={!n.analysis}
                  isOutdated={!!isOutdated}
                  isLoading={noteLoading === 'analysis'}
                  canDelete={true}
                  canGenerate={true}
                  onEdit={(newAnalysis) => handleUpdateAnalysis(n.id, newAnalysis)}
                  onDelete={() => handleDeleteAnalysis(n.id)}
                  onGenerate={() => handleGenerateAnalysis(n.id)}
                  onRegenerate={() => handleGenerateAnalysis(n.id)}
                />
                
                {/* Audio section - compact with inline delete */}
                {n.audioFilePath && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <AudioPlayerH5 
                        audioFilePath={n.audioFilePath} 
                        compact
                      />
                    </div>
                    <button 
                      className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteAudio?.(n.id); }}
                      title="Audio löschen"
                    >
                      <TablerIcon name="trash" size={16} />
                    </button>
                  </div>
                )}
                
                {/* Original transcript - lazy loaded with edit capability */}
                {(n.audioFileId || n.originalTranscript) && (
                  <OriginalTranscriptPanel
                    noteId={n.id}
                    initialTranscript={n.originalTranscript}
                    audioFileId={n.audioFileId}
                    onRestoreToContent={(text) => {
                      if (editingNoteId === n.id) {
                        onTextChange(text)
                      } else if (onUpdateContent) {
                        onUpdateContent(n.id, text)
                      }
                    }}
                    onOriginalUpdated={(_newOriginal) => {
                      onRefreshNotes?.()
                    }}
                    onRetranscribe={onRetranscribe}
                  />
                )}
                
                {/* OCR Sources - show for entries without audio (likely OCR-sourced) */}
                {!n.audioFileId && n.originalTranscript && (
                  <OCRSourcePanel
                    noteId={n.id}
                    initialTranscript={n.originalTranscript}
                    onRestoreToContent={(text) => {
                      if (editingNoteId === n.id) {
                        onTextChange(text)
                      } else if (onUpdateContent) {
                        onUpdateContent(n.id, text)
                      }
                    }}
                  />
                )}
                
                {/* Photos - includes both uploaded photos and images from markdown */}
                {(() => {
                  const textToScan = editingNoteId === n.id ? editingText : n.text
                  const markdownImages = extractImageUrls(textToScan)
                  const uploadedPhotos = n.photos || []
                  const allImages = [
                    ...uploadedPhotos.map((p, idx) => ({ type: 'uploaded' as const, data: p, index: idx })),
                    ...markdownImages.map((url, idx) => ({ type: 'markdown' as const, url, index: uploadedPhotos.length + idx }))
                  ]
                  
                  if (allImages.length === 0) return null
                  
                  return (
                    <div className="flex flex-wrap gap-2">
                      {allImages.map((img, idx) => {
                        // Validate URL before rendering
                        if (img.type === 'uploaded' && (!img.data.url || !img.data.url.trim())) {
                          return null
                        }
                        // Validate markdown image URLs - must start with / or http
                        if (img.type === 'markdown') {
                          const url = img.url
                          if (!url || (!url.startsWith('/') && !url.startsWith('http') && !url.startsWith('data:'))) {
                            return null
                          }
                        }
                        
                        return (
                        <div key={idx} className="relative group">
                          {img.type === 'uploaded' ? (
                            <>
                              <Image 
                                src={`${img.data.url}?v=${img.data.id}`} 
                                alt="Foto" 
                                width={64}
                                height={64}
                                className="w-16 h-16 object-cover rounded border border-slate-700 cursor-zoom-in" 
                                onClick={() => onViewPhoto(n.id, img.index)} 
                              />
                              <button 
                                className="btn btn-circle btn-error btn-xs absolute -top-2 -right-2 opacity-0 group-hover:opacity-100" 
                                title="Foto löschen" 
                                onClick={e => { e.stopPropagation(); e.preventDefault(); onDeletePhoto(img.data.id); }}
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <Image 
                              src={img.url} 
                              alt="Markdown Bild" 
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded border border-blue-500/50 cursor-zoom-in" 
                              onClick={() => onViewPhoto(n.id, img.index, img.url)}
                              title="Aus Markdown"
                            />
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )
                })()}
                
                {/* Photo upload */}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2">
                    <span className="pill text-xs">Foto hochladen</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          onUploadPhotos(n.id, e.target.files)
                        }
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <CameraPicker
                    label="Kamera"
                    buttonClassName="pill text-xs"
                    onCapture={(files) => onUploadPhotos(n.id, files)}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* AI Settings Popup */}
      {settingsPopupNoteId && (
        <AISettingsPopup
          isOpen={true}
          onClose={() => setSettingsPopupNoteId(null)}
          typeCode="diary"
          typeName="Tagebucheintrag"
        />
      )}
    </div>
  )
}
