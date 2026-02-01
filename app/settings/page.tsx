"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { SaveIndicator, useSaveIndicator } from '@/components/ui/SaveIndicator'
import { Icon } from '@/components/ui/Icon'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { LlmModelManager } from '@/components/features/ai/LlmModelManager'
import { ImageGenerationSettings } from '@/components/features/ai/ImageGenerationSettings'
import { PasscodeSettings } from '@/components/features/security/PasscodeSettings'
import { SharingDefaultsSection } from '@/components/features/settings/SharingDefaultsSection'
import { TestDataGenerator } from '@/components/features/settings/TestDataGenerator'
import { useLlmModels } from '@/hooks/useLlmModels'
import { type ImageGenerationSettings as ImageGenSettings } from '@/lib/config/imageModels'
import { DEFAULT_IMAGE_GENERATION_SETTINGS } from '@/lib/config/defaultImagePrompt'

type Me = {
  id: string
  username: string
  displayName: string | null
  profileImageUrl?: string | null
  settings: {
    theme: 'dark' | 'bright'
    autosaveEnabled: boolean
    autosaveIntervalSec: number
    timeFormat24h: boolean
    weekStart: string
    summaryModel?: string
    summaryPrompt?: string
    transcriptionModel?: string
    transcriptionPrompt?: string
    transcriptionGlossary?: string[]
    transcriptionModelLanguages?: Record<string, string>
    imageGenerationSettings?: ImageGenSettings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customModels?: any[]  // Legacy - now managed via LlmModel table
  } | null
}

type Habit = { id: string; title: string; userId: string | null; icon?: string | null }

type ImageSettings = {
  format: 'webp' | 'png' | 'jpeg'
  quality: number
  maxWidth: number
  maxHeight: number
}

type UserLink = { id: string; name: string; url: string }
type UserSymptom = { id: string; title: string; icon?: string | null }

const _STD_SYMPTOM_LABELS: Record<string, string> = {
  BESCHWERDEFREIHEIT: 'Beschwerdefreiheit',
  ENERGIE: 'Energielevel',
  STIMMUNG: 'Stimmung',
  SCHLAF: 'Schlaf',
  ENTSPANNUNG: 'Zeit für Entspannung',
  HEISSHUNGERFREIHEIT: 'Heißhungerfreiheit',
  BEWEGUNG: 'Bewegungslevel',
}

export default function SettingsPage() {
  const { models: llmModels } = useLlmModels()
  const router = useRouter()
  const { saving, savedAt, startSaving, doneSaving } = useSaveIndicator()

  const [me, setMe] = useState<Me | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [theme, setTheme] = useState<'dark' | 'bright'>('dark')
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [autosaveIntervalSec, setAutosaveIntervalSec] = useState(5)
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState('')
  const [imageSettings, setImageSettings] = useState<ImageSettings>({ format: 'webp', quality: 80, maxWidth: 1600, maxHeight: 1600 })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [links, setLinks] = useState<UserLink[]>([])
  const [newLinkName, setNewLinkName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [userSymptoms, setUserSymptoms] = useState<UserSymptom[]>([])
  const [newUserSymptom, setNewUserSymptom] = useState('')
  const [newUserSymptomIcon, setNewUserSymptomIcon] = useState('')
  const [newHabitIcon, setNewHabitIcon] = useState('')
  const [_habitIconDrafts, setHabitIconDrafts] = useState<Record<string, string>>({})
  const [_userSymptomIconDrafts, setUserSymptomIconDrafts] = useState<Record<string, string>>({})
  const [_stdSymptomIcons, setStdSymptomIcons] = useState<Record<string, string | null>>({})
  const [_stdSymptomIconDrafts, setStdSymptomIconDrafts] = useState<Record<string, string>>({})
  const [summaryModel, setSummaryModel] = useState('openai/gpt-oss-120b')
  const [summaryPrompt, setSummaryPrompt] = useState('Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"')
  const [transcriptionModel, setTranscriptionModel] = useState('openai/whisper-large-v3')
  const [transcriptionPrompt, setTranscriptionPrompt] = useState('')
  const [transcriptionGlossary, setTranscriptionGlossary] = useState<string[]>([])
  const [newGlossaryItem, setNewGlossaryItem] = useState('')
  const [transcriptionModelLanguages, setTranscriptionModelLanguages] = useState<Record<string, string>>({})
  const [imageGenSettings, setImageGenSettings] = useState<ImageGenSettings>(DEFAULT_IMAGE_GENERATION_SETTINGS)
  const [imageGenSaving, setImageGenSaving] = useState(false)
  
  // Available transcription models with their default languages
  const TRANSCRIPTION_MODELS = [
    { id: 'openai/whisper-large-v3', name: 'Whisper Large V3 (Together.ai)', defaultLang: 'de' },
    { id: 'deepgram/nova-3', name: 'Nova 3 (Deepgram)', defaultLang: 'de-CH' },
    { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe (OpenAI)', defaultLang: 'de' },
    { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe (OpenAI)', defaultLang: 'de' },
    { id: 'whisper-1', name: 'Whisper 1 (OpenAI)', defaultLang: 'de' },
  ]
  
  // Sort models alphabetically for summary selection
  const sortedModelsForSummary = useMemo(() => {
    return [...llmModels].sort((a, b) => a.name.localeCompare(b.name))
  }, [llmModels])
  
  // Sort transcription models alphabetically
  const sortedModelsForTranscription = useMemo(() => {
    return [...TRANSCRIPTION_MODELS].sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Avatar cropper state
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarScale, setAvatarScale] = useState(1)
  const [avatarOffset, setAvatarOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [lastPt, setLastPt] = useState<{ x: number; y: number } | null>(null)

  // Export state (currently unused; keep for future use)
  const [_expFrom, _setExpFrom] = useState<string>('')
  const [_expTo, _setExpTo] = useState<string>('')
  const [_expPhotos, _setExpPhotos] = useState<boolean>(false)

  async function load() {
    try {
      const [meRes, habitsRes, linksRes, userSymptomsRes, stdSymIconsRes] = await Promise.all([
        fetch('/api/me', { credentials: 'same-origin' }),
        fetch('/api/habits', { credentials: 'same-origin' }),
        fetch('/api/links', { credentials: 'same-origin' }),
        fetch('/api/user-symptoms', { credentials: 'same-origin' }),
        fetch('/api/symptom-icons', { credentials: 'same-origin' }),
      ])
      if (meRes.ok) {
        const data = await meRes.json()
        const u: Me = data.user
        setMe(u)
        setUsername(u.username)
        setDisplayName(u.displayName || '')
        setTheme(u.settings?.theme === 'bright' ? 'bright' : 'dark')
        setAutosaveEnabled(u.settings?.autosaveEnabled ?? true)
        setAutosaveIntervalSec(u.settings?.autosaveIntervalSec ?? 5)
        setSummaryModel(u.settings?.summaryModel || 'openai/gpt-oss-120b')
        setSummaryPrompt(u.settings?.summaryPrompt || 'Erstelle eine Zusammenfassung aller unten stehender Tagebucheinträge mit Bullet Points in der Form "**Schlüsselbegriff**: Erläuterung in 1-3 Sätzen"')
        setTranscriptionModel(u.settings?.transcriptionModel || 'openai/whisper-large-v3')
        setTranscriptionPrompt(u.settings?.transcriptionPrompt || '')
        setTranscriptionGlossary(u.settings?.transcriptionGlossary || [])
        setTranscriptionModelLanguages(u.settings?.transcriptionModelLanguages || {})
        if (u.settings?.imageGenerationSettings) {
          setImageGenSettings({ ...DEFAULT_IMAGE_GENERATION_SETTINGS, ...u.settings.imageGenerationSettings })
        }
      }
      if (habitsRes.ok) {
        const data = await habitsRes.json()
        setHabits(data.habits || [])
      }
      if (linksRes.ok) {
        const data = await linksRes.json()
        setLinks(Array.isArray(data.links) ? data.links : [])
      }
      if (userSymptomsRes.ok) {
        const data = await userSymptomsRes.json()
        setUserSymptoms(Array.isArray(data.symptoms) ? data.symptoms : [])
      }
      if (stdSymIconsRes.ok) {
        const data = await stdSymIconsRes.json()
        setStdSymptomIcons(data.icons || {})
      }
      try {
        const raw = localStorage.getItem('imageSettings')
        if (raw) {
          const parsed = JSON.parse(raw)
          setImageSettings({
            format: ['webp', 'png', 'jpeg'].includes(parsed.format) ? parsed.format : 'webp',
            quality: Math.min(100, Math.max(1, Number(parsed.quality) || 80)),
            maxWidth: Math.max(100, Number(parsed.maxWidth) || 1600),
            maxHeight: Math.max(100, Number(parsed.maxHeight) || 1600),
          })
        }
      } catch {}
    } catch {}
  }

  async function _saveHabitIcon(id: string, icon: string) {
    try {
      startSaving()
      const res = await fetch(`/api/habits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon }), credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        const r = await fetch('/api/habits', { credentials: 'same-origin' })
        const dd = await r.json()
        setHabits(dd.habits || [])
        setHabitIconDrafts(d => ({ ...d, [id]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  async function _saveUserSymptomIcon(id: string, icon: string) {
    try {
      startSaving()
      const res = await fetch(`/api/user-symptoms/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon }), credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        setUserSymptoms(list => list.map(s => s.id === id ? { ...s, icon: icon || null } : s))
        setUserSymptomIconDrafts(d => ({ ...d, [id]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  async function _saveStdSymptomIcon(type: string, icon: string) {
    try {
      startSaving()
      const res = await fetch('/api/symptom-icons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, icon }), credentials: 'same-origin' })
      await res.json().catch(() => ({}))
      if (res.ok) {
        setStdSymptomIcons(m => ({ ...m, [type]: icon || null }))
        setStdSymptomIconDrafts(d => ({ ...d, [type]: '' }))
      }
    } finally {
      doneSaving()
    }
  }

  function openAvatarDialog() {
    setAvatarOpen(true)
    setAvatarImg(null)
    setAvatarUrl(null)
    setAvatarScale(1)
    setAvatarOffset({ x: 0, y: 0 })
  }

  function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => { setAvatarImg(img) }
    img.src = url
    setAvatarUrl(url)
  }

  function onAvatarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(true)
    setLastPt({ x: e.clientX, y: e.clientY })
  }
  function onAvatarPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !lastPt) return
    const dx = e.clientX - lastPt.x
    const dy = e.clientY - lastPt.y
    setAvatarOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPt({ x: e.clientX, y: e.clientY })
  }
  function onAvatarPointerUp() {
    setDragging(false)
    setLastPt(null)
  }

  // Preview size measured from DOM to guarantee 1:1 crop regardless of rem/zoom
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [previewSize, setPreviewSize] = useState<number>(256)
  useEffect(() => {
    function update() {
      const el = previewRef.current
      if (el) setPreviewSize(Math.max(1, Math.round(el.clientWidth)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [avatarOpen])

  // Compute preview transform to match saveAvatar()
  const preview = useMemo(() => {
    if (!avatarImg) return null
    const ps = previewSize
    const baseScale = Math.max(ps / avatarImg.naturalWidth, ps / avatarImg.naturalHeight)
    const S = baseScale * avatarScale
    const width = avatarImg.naturalWidth * S
    const height = avatarImg.naturalHeight * S
    const left = ps / 2 - width / 2 + avatarOffset.x
    const top = ps / 2 - height / 2 + avatarOffset.y
    return { width, height, left, top }
  }, [avatarImg, avatarScale, avatarOffset, previewSize])

  async function saveAvatar() {
    if (!avatarImg) return
    // Create 512x512 canvas crop using current scale/offset
    const CANVAS_SIZE = 512
    const ps = previewSize // must match preview container pixel size
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_SIZE
    canvas.height = CANVAS_SIZE
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    // Compute effective scale to cover preview container at base scale 1
    const baseScale = Math.max(ps / avatarImg.naturalWidth, ps / avatarImg.naturalHeight)
    const S = baseScale * avatarScale
    // Image top-left in preview coords
    const left = ps / 2 - (avatarImg.naturalWidth * S) / 2 + avatarOffset.x
    const top = ps / 2 - (avatarImg.naturalHeight * S) / 2 + avatarOffset.y
    // Visible crop in source image
    let sx = (-left) / S
    let sy = (-top) / S
    let sw = ps / S
    let sh = ps / S
    // Clamp to image bounds
    if (sx < 0) { sw += sx; sx = 0 }
    if (sy < 0) { sh += sy; sy = 0 }
    if (sx + sw > avatarImg.naturalWidth) sw = avatarImg.naturalWidth - sx
    if (sy + sh > avatarImg.naturalHeight) sh = avatarImg.naturalHeight - sy
    if (sw <= 0 || sh <= 0) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(avatarImg, sx, sy, sw, sh, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), 'image/webp', 0.9)!)
    const form = new FormData()
    form.append('file', blob, 'avatar.webp')
    try {
      const r = await fetch('/api/me/avatar', { method: 'POST', body: form })
      const j = await r.json()
      if (r.ok && j?.ok) {
        setMe(m => m ? { ...m, profileImageUrl: j.url } : m)
        setAvatarOpen(false)
        if (avatarUrl) { try { URL.revokeObjectURL(avatarUrl) } catch {} }
      }
    } catch {}
  }

  async function deleteAvatar() {
    try {
      const r = await fetch('/api/me/avatar', { method: 'DELETE' })
      await r.json().catch(() => ({}))
      if (r.ok) setMe(m => m ? { ...m, profileImageUrl: null } : m)
    } catch {}
  }

  async function addUserSymptom() {
    const title = newUserSymptom.trim()
    if (!title) return
    try {
      const res = await fetch('/api/user-symptoms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, icon: newUserSymptomIcon || null }), credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        const r = await fetch('/api/user-symptoms', { credentials: 'same-origin' })
        const dd = await r.json()
        setUserSymptoms(Array.isArray(dd.symptoms) ? dd.symptoms : [])
        setNewUserSymptom('')
        setNewUserSymptomIcon('')
      }
    } catch {}
  }

  async function deleteUserSymptom(id: string) {
    if (!id) return
    try {
      const res = await fetch(`/api/user-symptoms/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        setUserSymptoms(list => list.filter(s => s.id !== id))
      }
    } catch {}
  }

  useEffect(() => { void load() }, [])

  async function addLink() {
    const name = newLinkName.trim()
    const url = newLinkUrl.trim()
    if (!name || !url) return
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (res.ok && data?.ok) {
        try {
          const r = await fetch('/api/links', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setLinks(Array.isArray(dd.links) ? dd.links : [])
          }
        } catch {}
        setNewLinkName('')
        setNewLinkUrl('')
      }
    } catch {}
  }

  async function deleteLink(id: string) {
    if (!id) return
    try {
      const res = await fetch(`/api/links/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (res.ok && data?.ok) {
        setLinks(ls => ls.filter(l => l.id !== id))
      }
    } catch {}
  }


  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName })
      })
      const data = await res.json()
      if (!res.ok) {
        setProfileError(data?.error || 'Speichern fehlgeschlagen')
      } else {
        setMe(data.user)
      }
    } catch {
      setProfileError('Netzwerkfehler')
    } finally {
      doneSaving()
    }
  }

  async function saveUI() {
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { theme } })
      })
      if (res.ok) {
        // Apply theme immediately on client for instant feedback
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
          root.classList.remove('bright')
        } else {
          root.classList.remove('dark')
          root.classList.add('bright')
        }
        // Persist cookie so server-side rendering reads the same preference
        try { document.cookie = `theme=${theme}; path=/; max-age=31536000`; } catch {}
        router.refresh()
      }
    } finally {
      doneSaving()
    }
  }

  async function saveCapture() {
    // Persist only in localStorage for client-side photo upload preferences
    try {
      localStorage.setItem('imageSettings', JSON.stringify(imageSettings))
    } catch {}
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { autosaveEnabled, autosaveIntervalSec, summaryModel, summaryPrompt } })
      })
      await res.json().catch(() => ({}))
    } finally {
      doneSaving()
    }
  }

  async function saveSummarySettings() {
    startSaving()
    try {
      await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { summaryModel, summaryPrompt } })
      })
    } finally {
      doneSaving()
    }
  }

  async function saveTranscriptionSettings() {
    startSaving()
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { transcriptionModel, transcriptionPrompt, transcriptionGlossary, transcriptionModelLanguages } })
      })
      await res.json().catch(() => ({}))
    } finally {
      doneSaving()
    }
  }

  async function saveImageGenSettings() {
    startSaving()
    setImageGenSaving(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { imageGenerationSettings: imageGenSettings } })
      })
      if (!res.ok) {
        console.error('Failed to save image generation settings')
        return
      }
      // Update local state with saved settings
      const data = await res.json()
      if (data.user?.settings?.imageGenerationSettings) {
        const savedSettings = data.user.settings.imageGenerationSettings
        setImageGenSettings(savedSettings)
        // Also update the me state to reflect the saved settings
        setMe(prev => prev ? {
          ...prev,
          settings: prev.settings ? {
            ...prev.settings,
            imageGenerationSettings: savedSettings
          } : prev.settings
        } : prev)
      }
    } catch (error) {
      console.error('Error saving image generation settings:', error)
    } finally {
      setImageGenSaving(false)
      doneSaving()
    }
  }
  
  function _updateModelLanguage(modelId: string, language: string) {
    setTranscriptionModelLanguages(prev => ({
      ...prev,
      [modelId]: language
    }))
  }

  function _addGlossaryItem() {
    const item = newGlossaryItem.trim()
    if (!item) return
    if (!transcriptionGlossary.includes(item)) {
      setTranscriptionGlossary([...transcriptionGlossary, item])
    }
    setNewGlossaryItem('')
  }

  function _removeGlossaryItem(index: number) {
    setTranscriptionGlossary(transcriptionGlossary.filter((_, i) => i !== index))
  }

  async function addHabit() {
    const title = newHabit.trim()
    if (!title) return
    try {
      const res = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, icon: newHabitIcon || null }), credentials: 'same-origin' })
      const data = await res.json()
      if (data?.habit) {
        // Refresh from server to ensure full, sorted list and userId present
        try {
          const r = await fetch('/api/habits', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setHabits(dd.habits || [])
          }
        } catch {}
        setNewHabit('')
        setNewHabitIcon('')
      }
    } catch {}
  }

  async function deleteHabit(id: string, userId: string | null) {
    if (!id || !userId) return // allow deleting only user-owned habits
    try {
      const res = await fetch(`/api/habits/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json()
      if (data?.ok) {
        // Reload from server to reflect authoritative state
        try {
          const r = await fetch('/api/habits', { credentials: 'same-origin' })
          if (r.ok) {
            const dd = await r.json()
            setHabits(dd.habits || [])
          } else {
            setHabits(hs => hs.filter(h => h.id !== id))
          }
        } catch {
          setHabits(hs => hs.filter(h => h.id !== id))
        }
      }
    } catch {}
  }

  const [activeTab, setActiveTab] = useState<'profil' | 'darstellung' | 'erfassung' | 'ki' | 'daten'>('profil')

  return (
    <>
      <div className="space-y-6">
      <h1 className="text-xl font-semibold">
        <span className="inline-flex items-center gap-1">
          <TablerIcon name="settings" />
          <span>Einstellungen</span>
        </span>
      </h1>

      {/* Tabs Navigation - DaisyUI radio tabs-lift with icons */}
      <div className="tabs tabs-lift">
        <label className="tab">
          <input 
            type="radio" 
            name="settings_tabs" 
            checked={activeTab === 'profil'}
            onChange={() => setActiveTab('profil')}
          />
          <TablerIcon name="user" size={16} />
          <span className="ml-1 hidden sm:inline">Profil</span>
        </label>
        <div className={`tab-content bg-base-100 border-base-300 p-4 ${activeTab === 'profil' ? '' : 'hidden'}`}>
          {/* Profil Tab Content */}
          <div className="space-y-4">
            {/* Accordion: Profil */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300" open>
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="manage_accounts" size={18} />
                  Profil
                </span>
              </summary>
              <div className="collapse-content">
                <form onSubmit={saveProfile} className="grid gap-3 max-w-md pt-2">
                  <label className="text-sm text-gray-400">Anzeigename
                    <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  </label>
                  <label className="text-sm text-gray-400">Benutzername
                    <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={username} onChange={e => setUsername(e.target.value)} />
                  </label>
                  {profileError && <div className="alert alert-error"><span className="text-sm">{profileError}</span></div>}
                  <div className="flex items-center gap-2">
                    <button type="submit" className="btn btn-success">Speichern</button>
                    <SaveIndicator saving={saving} savedAt={savedAt} />
                  </div>
                </form>
              </div>
            </details>

            {/* Accordion: Avatar */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="photo" size={18} />
                  Profilbild
                </span>
              </summary>
              <div className="collapse-content">
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-20 h-20 rounded-full bg-base-300 flex items-center justify-center overflow-hidden">
                    {me?.profileImageUrl ? (
                      <NextImage src={me.profileImageUrl} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm text-gray-300 font-semibold">{(displayName || username || '?').slice(0,1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="pill" onClick={openAvatarDialog}>Profilbild ändern</button>
                    {me?.profileImageUrl && <button className="pill" onClick={deleteAvatar}>Entfernen</button>}
                  </div>
                </div>
              </div>
            </details>

            {/* Accordion: Sharing Defaults */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="share" size={18} />
                  Einträge teilen
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <SharingDefaultsSection />
              </div>
            </details>
          </div>
        </div>

        <label className="tab">
          <input 
            type="radio" 
            name="settings_tabs" 
            checked={activeTab === 'darstellung'}
            onChange={() => setActiveTab('darstellung')}
          />
          <TablerIcon name="palette" size={16} />
          <span className="ml-1 hidden sm:inline">Darstellung</span>
        </label>
        <div className={`tab-content bg-base-100 border-base-300 p-4 ${activeTab === 'darstellung' ? '' : 'hidden'}`}>
          {/* Darstellung Tab Content */}
          <div className="space-y-4">
            {/* Accordion: Theme */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300" open>
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="palette" size={18} />
                  Theme
                </span>
              </summary>
              <div className="collapse-content">
                <div className="flex items-center gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span>Theme</span>
                    <select value={theme} onChange={e => setTheme(e.target.value as 'dark' | 'bright')} className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm">
                      <option value="dark">Dark</option>
                      <option value="bright">Bright</option>
                    </select>
                  </label>
                  <button className="pill" onClick={saveUI}>Übernehmen</button>
                </div>
              </div>
            </details>

            {/* Accordion: Passcode */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="lock" size={18} />
                  Passcode-Schutz
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <PasscodeSettings onSave={() => doneSaving()} />
              </div>
            </details>
          </div>
        </div>

        <label className="tab">
          <input 
            type="radio" 
            name="settings_tabs" 
            checked={activeTab === 'erfassung'}
            onChange={() => setActiveTab('erfassung')}
          />
          <TablerIcon name="edit" size={16} />
          <span className="ml-1 hidden sm:inline">Erfassung</span>
        </label>
        <div className={`tab-content bg-base-100 border-base-300 p-4 ${activeTab === 'erfassung' ? '' : 'hidden'}`}>
          {/* Erfassung Tab Content */}
          <div className="space-y-4">
            <details className="collapse collapse-arrow bg-base-200 border border-base-300" open>
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="tune" size={18} />
                  Autosave & Komprimierung
                </span>
              </summary>
              <div className="collapse-content">
                <div className="grid gap-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span>Autosave</span>
                    <input
                      type="checkbox"
                      checked={autosaveEnabled}
                      onChange={e => setAutosaveEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Automatisches Speichern beim Tippen</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span>Intervall (Sek.)</span>
                    <input type="number" min={1} max={3600} value={autosaveIntervalSec} onChange={e => setAutosaveIntervalSec(Math.max(1, Math.min(3600, Number(e.target.value) || 1)))} className="w-28 bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" />
                  </label>
                  <div className="h-px bg-slate-800 my-2" />
                  <div className="text-sm text-gray-400">Foto-Komprimierung & Auflösung</div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm">
                      <div className="text-gray-400">Format</div>
                      <select
                        value={imageSettings.format}
                        onChange={e => setImageSettings(s => ({ ...s, format: e.target.value as ImageSettings['format'] }))}
                        className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="webp">WebP (empfohlen)</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">Qualität</div>
                      <input type="number" min={1} max={100} value={imageSettings.quality} onChange={e => setImageSettings(s => ({ ...s, quality: Math.max(1, Math.min(100, Number(e.target.value) || 80)) }))} className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">Max. Breite</div>
                      <input type="number" min={100} max={8000} value={imageSettings.maxWidth} onChange={e => setImageSettings(s => ({ ...s, maxWidth: Math.max(100, Math.min(8000, Number(e.target.value) || 1600)) }))} className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">Max. Höhe</div>
                      <input type="number" min={100} max={8000} value={imageSettings.maxHeight} onChange={e => setImageSettings(s => ({ ...s, maxHeight: Math.max(100, Math.min(8000, Number(e.target.value) || 1600)) }))} className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="pill !bg-green-600 !text-white" onClick={saveCapture}>Speichern</button>
                    <SaveIndicator saving={saving} savedAt={savedAt} />
                  </div>
                </div>
              </div>
            </details>

<<<<<<< E:/bjoer/Documents/repos/comp-act-diary/app/settings/page.tsx
=======
            {/* Link to Journal Entry Types */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="layout-grid" size={18} />
                  Eintragstypen
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <p className="text-sm text-gray-400 mb-3">
                  Verwalte die Typen für deine Journal-Einträge (z.B. Tagebuch, Reflexion, Notiz).
                </p>
                <Link href="/settings/types" className="pill">
                  Typen verwalten →
                </Link>
              </div>
            </details>

>>>>>>> C:/Users/bjoer/.windsurf/worktrees/comp-act-diary/comp-act-diary-51aed217/app/settings/page.tsx
            {/* Link to Journal Templates */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="template" size={18} />
                  Journal-Templates
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <p className="text-sm text-gray-400 mb-3">
                  Verwalte Templates für Journal-Einträge mit benutzerdefinierten Feldern und KI-Konfiguration.
                </p>
                <Link href="/settings/templates" className="pill">
                  Templates verwalten →
                </Link>
              </div>
            </details>
          </div>
        </div>

        <label className="tab">
          <input 
            type="radio" 
            name="settings_tabs" 
            checked={activeTab === 'ki'}
            onChange={() => setActiveTab('ki')}
          />
          <TablerIcon name="brain" size={16} />
          <span className="ml-1 hidden sm:inline">KI & Modelle</span>
        </label>
        <div className={`tab-content bg-base-100 border-base-300 p-4 ${activeTab === 'ki' ? '' : 'hidden'}`}>
          {/* KI Tab Content */}
          <div className="space-y-4">
            <LlmModelManager startSaving={startSaving} doneSaving={doneSaving} saving={saving} savedAt={savedAt} />
            
            {/* Accordion: KI-Zusammenfassung */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <Icon name="summarize" />
                  KI-Zusammenfassung
                </span>
              </summary>
              <div className="collapse-content">
                <div className="space-y-2 pt-2">
                  <label className="block text-sm">
                    <span className="text-gray-400 mb-1 block">Modell</span>
                    <select
                      value={summaryModel}
                      onChange={(e) => setSummaryModel(e.target.value)}
                      className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
                    >
                      {sortedModelsForSummary.map((m) => (
                        <option key={m.modelId} value={m.modelId}>
                          {m.name} ({m.inputCost || '-'} / {m.outputCost || '-'}) [{m.provider}]
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-400 mb-1 block">System-Prompt</span>
                    <textarea
                      value={summaryPrompt}
                      onChange={(e) => setSummaryPrompt(e.target.value)}
                      rows={4}
                      className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm font-mono"
                      placeholder="System-Prompt für die Zusammenfassung..."
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-success btn-sm" onClick={saveSummarySettings}>Speichern</button>
                    <SaveIndicator saving={saving} savedAt={savedAt} />
                  </div>
                </div>
              </div>
            </details>

            {/* Accordion: Transkription */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="microphone" size={18} />
                  Transkription
                </span>
              </summary>
              <div className="collapse-content">
                <div className="space-y-2 pt-2">
                  <label className="block text-sm">
                    <span className="text-gray-400 mb-1 block">Modell</span>
                    <select
                      value={transcriptionModel}
                      onChange={(e) => setTranscriptionModel(e.target.value)}
                      className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm"
                    >
                      {sortedModelsForTranscription.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-success btn-sm" onClick={saveTranscriptionSettings}>Speichern</button>
                    <SaveIndicator saving={saving} savedAt={savedAt} />
                  </div>
                </div>
              </div>
            </details>

            {/* Accordion: Bildgenerierung */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="photo" size={18} />
                  Bildgenerierung
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <ImageGenerationSettings
                  settings={imageGenSettings}
                  onSettingsChange={setImageGenSettings}
                  onSave={saveImageGenSettings}
                  saving={imageGenSaving}
                  onSaveComplete={() => {
                    // Reload settings from server to ensure consistency
                    void load()
                  }}
                />
              </div>
            </details>
          </div>
        </div>

        <label className="tab">
          <input 
            type="radio" 
            name="settings_tabs" 
            checked={activeTab === 'daten'}
            onChange={() => setActiveTab('daten')}
          />
          <TablerIcon name="database" size={16} />
          <span className="ml-1 hidden sm:inline">Daten</span>
        </label>
        <div className={`tab-content bg-base-100 border-base-300 p-4 ${activeTab === 'daten' ? '' : 'hidden'}`}>
          {/* Daten Tab Content */}
          <div className="space-y-4">
            {/* Accordion: Gewohnheiten */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="checklist" size={18} />
                  Gewohnheiten
                </span>
              </summary>
              <div className="collapse-content">
                <div className="max-w-xl space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <label className="md:col-span-4 text-sm">
                      <div className="text-gray-400">Name</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" placeholder="Neue Gewohnheit…" value={newHabit} onChange={e => setNewHabit(e.target.value)} />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">Icon</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" placeholder="z.B. 😊" value={newHabitIcon} onChange={e => setNewHabitIcon(e.target.value)} />
                    </label>
                    <div>
                      <button className="pill" onClick={addHabit} disabled={!newHabit.trim()}>Hinzufügen</button>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {habits.map(h => (
                      <li key={h.id} className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6">{h.icon ? <Icon name={h.icon} /> : null}</span>
                          <span className="font-medium">{h.title}</span>
                          <span className="text-xs text-gray-400">{h.userId ? 'Eigen' : 'Standard'}</span>
                        </div>
                        {h.userId && (
                          <button className="pill" onClick={() => deleteHabit(h.id, h.userId)}>
                            <TablerIcon name="delete" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            {/* Accordion: Symptome */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="stethoscope" size={18} />
                  Symptome
                </span>
              </summary>
              <div className="collapse-content">
                <div className="max-w-xl space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <label className="md:col-span-4 text-sm">
                      <div className="text-gray-400">Name</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={newUserSymptom} onChange={e => setNewUserSymptom(e.target.value)} placeholder="z. B. Kopfschmerzen" />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">Icon</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={newUserSymptomIcon} onChange={e => setNewUserSymptomIcon(e.target.value)} placeholder="z. B. 😊" />
                    </label>
                    <div>
                      <button className="pill" onClick={addUserSymptom} disabled={!newUserSymptom.trim()}>Hinzufügen</button>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {userSymptoms.map(s => (
                      <li key={s.id} className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6">{s.icon ? <Icon name={s.icon} /> : null}</span>
                          <span className="font-medium">{s.title}</span>
                        </div>
                        <button className="pill" onClick={() => deleteUserSymptom(s.id)}>
                          <TablerIcon name="delete" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            {/* Accordion: Links */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="link" size={18} />
                  Schnelllinks
                </span>
              </summary>
              <div className="collapse-content">
                <div className="max-w-xl space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                    <label className="text-sm">
                      <div className="text-gray-400">Name</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Name" />
                    </label>
                    <label className="text-sm">
                      <div className="text-gray-400">URL</div>
                      <input className="w-full bg-base-100 border border-base-300 rounded px-2 py-1 text-sm" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." />
                    </label>
                  </div>
                  <button className="pill" onClick={addLink} disabled={!newLinkName.trim() || !newLinkUrl.trim()}>Hinzufügen</button>
                  <ul className="space-y-2">
                    {links.map(l => (
                      <li key={l.id} className="text-sm flex items-center justify-between">
                        <div className="truncate">
                          <span className="font-medium">{l.name}</span>
                          <span className="ml-2 text-xs text-gray-400 truncate">{l.url}</span>
                        </div>
                        <button className="pill" onClick={() => deleteLink(l.id)}>Löschen</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            {/* Accordion: Standort */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="location_on" size={18} />
                  Standort-Tracking
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <div className="text-sm text-gray-400 mb-2">
                  OwnTracks-Webhook konfigurieren, API-Tokens verwalten und Google Timeline importieren.
                </div>
                <a href="/settings/location" className="btn btn-primary btn-sm">
                  Standort-Einstellungen öffnen
                </a>
              </div>
            </details>

            {/* Accordion: Kalender-Synchronisation */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="calendar_month" size={18} />
                  Kalender-Synchronisation
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <div className="text-sm text-gray-400 mb-2">
                  Tasker-Webhook konfigurieren, Tokens verwalten und Pattern-Matching einrichten.
                </div>
                <a href="/settings/calendar" className="btn btn-primary btn-sm">
                  Kalender-Einstellungen öffnen
                </a>
              </div>
            </details>

            {/* Accordion: Testdaten-Generator */}
            <details className="collapse collapse-arrow bg-base-200 border border-base-300">
              <summary className="collapse-title font-medium">
                <span className="inline-flex items-center gap-2">
                  <TablerIcon name="test-pipe" size={18} />
                  Testdaten generieren
                </span>
              </summary>
              <div className="collapse-content pt-2">
                <TestDataGenerator />
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Close main container */}
      </div>

      {/* Avatar Modal */}
      {avatarOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setAvatarOpen(false)}>
          <div className="bg-surface border border-slate-800 rounded-xl p-4 w-[360px]" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">Profilbild zuschneiden</div>
            <div
              className="relative mx-auto mb-3 h-64 w-64 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 touch-none select-none"
              ref={previewRef}
              onPointerDown={onAvatarPointerDown}
              onPointerMove={onAvatarPointerMove}
              onPointerUp={onAvatarPointerUp}
              onPointerCancel={onAvatarPointerUp}
            >
              {avatarUrl ? (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: `${preview?.left ?? 0}px ${preview?.top ?? 0}px`,
                    backgroundSize: preview ? `${preview.width}px ${preview.height}px` : undefined,
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Bild wählen…</div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input type="range" min={1} max={3} step={0.01} value={avatarScale} onChange={e => setAvatarScale(Number(e.target.value))} className="flex-1" />
              <span className="text-xs text-gray-400 w-10 text-right">{avatarScale.toFixed(2)}×</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="pill cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />Bild wählen
              </label>
              <div className="flex items-center gap-2">
                <button className="pill" onClick={() => setAvatarOpen(false)}>Abbrechen</button>
                <button className="pill !bg-green-600 !text-white" onClick={saveAvatar} disabled={!avatarImg}>Zuschneiden & Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

