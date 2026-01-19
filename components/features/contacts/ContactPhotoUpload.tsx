'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { IconCamera, IconTrash, IconStar, IconStarFilled, IconPlus, IconX } from '@tabler/icons-react'

interface Photo {
  id: string
  assetId: string
  url: string
  role: string
  displayOrder: number
}

interface ContactPhotoUploadProps {
  contactId: string
  currentPhotoUrl?: string | null
  onPhotoChange?: (url: string | null) => void
}

export default function ContactPhotoUpload({ 
  contactId, 
  currentPhotoUrl,
  onPhotoChange 
}: ContactPhotoUploadProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/photos`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data.photos || [])
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    void fetchPhotos()
  }, [fetchPhotos, contactId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('role', photos.length === 0 ? 'COVER' : 'GALLERY')

      const res = await fetch(`/api/contacts/${contactId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        await fetchPhotos()
        if (data.photo.role === 'COVER') {
          onPhotoChange?.(data.photo.url)
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Foto wirklich löschen?')) return

    try {
      const res = await fetch(`/api/contacts/${contactId}/photos?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchPhotos()
        // Check if we deleted the cover
        const deletedPhoto = photos.find(p => p.id === attachmentId)
        if (deletedPhoto?.role === 'COVER') {
          const remaining = photos.filter(p => p.id !== attachmentId)
          onPhotoChange?.(remaining[0]?.url || null)
        }
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
    }
  }

  const handleSetAsCover = async (photo: Photo) => {
    try {
      // Upload same photo as COVER (will demote old cover)
      const res = await fetch(`/api/contacts/${contactId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId: photo.id, role: 'COVER' }),
      })

      if (res.ok) {
        await fetchPhotos()
        onPhotoChange?.(photo.url)
      }
    } catch (error) {
      console.error('Error setting cover:', error)
    }
  }

  const coverPhoto = photos.find(p => p.role === 'COVER')
  const _galleryPhotos = photos.filter(p => p.role === 'GALLERY')

  return (
    <div className="space-y-4">
      {/* Main Photo Display */}
      <div className="relative group">
        <div className="avatar placeholder">
          {coverPhoto || currentPhotoUrl ? (
            <div className="rounded-full w-24 h-24 ring ring-primary ring-offset-base-100 ring-offset-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={coverPhoto?.url || currentPhotoUrl || ''} 
                alt="Profilbild" 
                className="rounded-full object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="bg-primary/10 text-primary rounded-full w-24 h-24 flex items-center justify-center">
              <IconCamera size={32} />
            </div>
          )}
        </div>
        
        {/* Upload overlay */}
        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <span className="loading loading-spinner loading-sm text-white" />
          ) : (
            <IconCamera size={24} className="text-white" />
          )}
        </label>
      </div>

      {/* Gallery */}
      {photos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Galerie ({photos.length})</div>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={photo.url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Cover badge */}
                {photo.role === 'COVER' && (
                  <div className="absolute -top-1 -right-1 bg-warning text-warning-content rounded-full p-0.5">
                    <IconStarFilled size={12} />
                  </div>
                )}
                
                {/* Actions overlay */}
                <div 
                  className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity cursor-pointer"
                  onClick={() => setLightboxPhoto(photo)}
                >
                  {photo.role !== 'COVER' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleSetAsCover(photo) }}
                      className="btn btn-xs btn-circle btn-ghost hover:bg-white/20"
                      title="Als Hauptbild setzen"
                    >
                      <IconStar size={14} stroke={2} color="white" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleDelete(photo.id) }}
                    className="btn btn-xs btn-circle btn-ghost text-white hover:bg-white/20"
                    title="Löschen"
                  >
                    <IconTrash size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add more button */}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <IconPlus size={20} className="text-base-content/50" />
            </label>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-2">
          <span className="loading loading-spinner loading-sm" />
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 btn btn-circle btn-ghost text-white"
            onClick={() => setLightboxPhoto(null)}
          >
            <IconX size={24} />
          </button>
          
          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 btn btn-circle btn-ghost text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = photos.findIndex(p => p.id === lightboxPhoto.id)
                  const prevIdx = idx > 0 ? idx - 1 : photos.length - 1
                  setLightboxPhoto(photos[prevIdx])
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 btn btn-circle btn-ghost text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  const idx = photos.findIndex(p => p.id === lightboxPhoto.id)
                  const nextIdx = idx < photos.length - 1 ? idx + 1 : 0
                  setLightboxPhoto(photos[nextIdx])
                }}
              >
                ›
              </button>
            </>
          )}
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxPhoto.url} 
            alt="" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Actions in lightbox */}
          <div className="absolute bottom-4 flex gap-2">
            {lightboxPhoto.role !== 'COVER' && (
              <button
                onClick={(e) => { e.stopPropagation(); void handleSetAsCover(lightboxPhoto); setLightboxPhoto(null) }}
                className="btn btn-sm btn-primary"
              >
                <IconStar size={16} />
                Als Hauptbild
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); void handleDelete(lightboxPhoto.id); setLightboxPhoto(null) }}
              className="btn btn-sm btn-error"
            >
              <IconTrash size={16} />
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
