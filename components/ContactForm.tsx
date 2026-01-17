'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ContactCreateSchema, type ContactCreate } from '@/lib/validators/contact'
import { IconPlus, IconTrash, IconArrowLeft } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReadMode } from '@/hooks/useReadMode'

interface ContactFormProps {
  initialData?: Partial<ContactCreate> & { id?: string; slug?: string }
  mode: 'create' | 'edit'
}

export default function ContactForm({ initialData, mode }: ContactFormProps) {
  const { readMode } = useReadMode()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [socialUrls, setSocialUrls] = useState<Array<{ type: string; url: string }>>(
    (initialData?.socialUrls as Array<{ type: string; url: string }>) || []
  )
  const [namesToDetect, setNamesToDetect] = useState<string>(
    (initialData?.namesToDetectAsMention as string[] || []).join(', ')
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactCreate>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ContactCreateSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      givenName: initialData?.givenName || '',
      familyName: initialData?.familyName || '',
      nickname: initialData?.nickname || '',
      emailPrivate: initialData?.emailPrivate || '',
      emailWork: initialData?.emailWork || '',
      phonePrivate: initialData?.phonePrivate || '',
      phoneWork: initialData?.phoneWork || '',
      addressHome: initialData?.addressHome || '',
      addressWork: initialData?.addressWork || '',
      company: initialData?.company || '',
      jobTitle: initialData?.jobTitle || '',
      notes: initialData?.notes || '',
      birthday: initialData?.birthday ? new Date(initialData.birthday) : undefined,
      firstMetAt: initialData?.firstMetAt ? new Date(initialData.firstMetAt) : undefined,
      websiteUrl: initialData?.websiteUrl || '',
      relationshipLevel: initialData?.relationshipLevel || null,
      isFavorite: initialData?.isFavorite || false,
      socialUrls: (initialData?.socialUrls as ContactCreate['socialUrls']) || null,
      locationId: initialData?.locationId || null,
    },
  })

  const onSubmit = async (data: ContactCreate) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        socialUrls: socialUrls.length > 0 ? socialUrls : null,
        namesToDetectAsMention: namesToDetect.trim()
          ? namesToDetect.split(',').map(n => n.trim()).filter(n => n.length > 0)
          : null,
      }

      const url = mode === 'edit' && initialData?.id 
        ? `/api/contacts/${initialData.id}`
        : '/api/contacts'
      
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const { contact } = await res.json()
        
        // Ask user if they want to sync to Google
        if (mode === 'edit' || contact.googleResourceName) {
          const shouldSync = confirm(
            'Kontakt gespeichert! Möchtest du die Änderungen mit Google Kontakten synchronisieren?'
          )
          
          if (shouldSync) {
            try {
              const syncRes = await fetch(`/api/contacts/${contact.id}/push-to-google`, {
                method: 'POST',
              })
              if (syncRes.ok) {
                const syncData = await syncRes.json()
                alert(syncData.isNew ? 'Kontakt wurde zu Google hinzugefügt!' : 'Änderungen wurden mit Google synchronisiert!')
              } else {
                const syncError = await syncRes.json()
                alert(`Sync-Fehler: ${syncError.error || 'Unbekannter Fehler'}`)
              }
            } catch (syncError) {
              console.error('Error syncing to Google:', syncError)
              alert('Fehler beim Synchronisieren mit Google')
            }
          }
        }
        
        router.push(`/prm/${contact.slug}`)
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setSaving(false)
    }
  }

  const addSocialUrl = () => {
    setSocialUrls([...socialUrls, { type: '', url: '' }])
  }

  const removeSocialUrl = (index: number) => {
    setSocialUrls(socialUrls.filter((_, i) => i !== index))
  }

  const updateSocialUrl = (index: number, field: 'type' | 'url', value: string) => {
    const updated = [...socialUrls]
    updated[index][field] = value
    setSocialUrls(updated)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={mode === 'edit' && initialData?.slug ? `/prm/${initialData.slug}` : '/prm'} className="btn btn-ghost btn-sm btn-circle">
          <IconArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">
          {mode === 'edit' ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
        </h1>
      </div>

      {/* Basic Info */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Grunddaten</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-control sm:col-span-2">
              <label className="label">
                <span className="label-text">Anzeigename *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                placeholder="Max Mustermann"
                {...register('name')}
              />
              {errors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.name.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vorname</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Max"
                {...register('givenName')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Nachname</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Mustermann"
                {...register('familyName')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Spitzname</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Maxi"
                {...register('nickname')}
              />
            </div>

            <div className="form-control sm:col-span-2">
              <label className="label">
                <span className="label-text">Alternative Namen für Erwähnungserkennung</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Anna, Annalena, Anna-Lena"
                value={namesToDetect}
                onChange={(e) => setNamesToDetect(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">Kommagetrennte Liste von Namen, die als Erwähnung dieser Person erkannt werden sollen</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Geburtstag</span>
              </label>
              <input
                type="date"
                className={`input input-bordered ${errors.birthday ? 'input-error' : ''}`}
                defaultValue={initialData?.birthday ? (() => { const d = new Date(initialData.birthday); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : ''}
                {...register('birthday')}
              />
              {errors.birthday && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.birthday.message}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Kontaktdaten</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">E-Mail (privat)</span>
              </label>
              <input
                type="email"
                className={`input input-bordered ${errors.emailPrivate ? 'input-error' : ''}`}
                placeholder="max@privat.de"
                {...register('emailPrivate')}
              />
              {errors.emailPrivate && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.emailPrivate.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">E-Mail (geschäftlich)</span>
              </label>
              <input
                type="email"
                className={`input input-bordered ${errors.emailWork ? 'input-error' : ''}`}
                placeholder="max@firma.de"
                {...register('emailWork')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Telefon (privat)</span>
              </label>
              <input
                type="tel"
                className="input input-bordered"
                placeholder="+41 79 123 45 67"
                {...register('phonePrivate')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Telefon (geschäftlich)</span>
              </label>
              <input
                type="tel"
                className="input input-bordered"
                placeholder="+41 44 123 45 67"
                {...register('phoneWork')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Adresse (privat)</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="Musterstrasse 1&#10;8000 Zürich"
                rows={2}
                {...register('addressHome')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Adresse (geschäftlich)</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                placeholder="Firmenstrasse 99&#10;8001 Zürich"
                rows={2}
                {...register('addressWork')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Work Info */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Berufliche Angaben</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Firma</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Musterfirma AG"
                {...register('company')}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Position</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="Software Engineer"
                {...register('jobTitle')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Online Presence */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Online-Präsenz</h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Website</span>
            </label>
            <input
              type="url"
              className={`input input-bordered ${errors.websiteUrl ? 'input-error' : ''}`}
              placeholder="https://example.com"
              {...register('websiteUrl')}
            />
          </div>

          <div className="divider">Social Media</div>

          {socialUrls.map((social, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="form-control flex-1">
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder="Typ (z.B. LinkedIn)"
                  value={social.type}
                  onChange={(e) => updateSocialUrl(index, 'type', e.target.value)}
                />
              </div>
              <div className="form-control flex-[2]">
                <input
                  type="url"
                  className="input input-bordered input-sm"
                  placeholder="URL"
                  value={social.url}
                  onChange={(e) => updateSocialUrl(index, 'url', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeSocialUrl(index)}
                className="btn btn-ghost btn-sm btn-circle text-error"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addSocialUrl}
            className="btn btn-ghost btn-sm w-fit"
          >
            <IconPlus size={16} />
            Social Media hinzufügen
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Notizen</h2>
          
          <div className="form-control">
            <textarea
              className="textarea textarea-bordered"
              placeholder="Zusätzliche Informationen..."
              rows={4}
              {...register('notes')}
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                {...register('isFavorite')}
              />
              <span className="label-text">Als Favorit markieren</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions - hide save button in read mode */}
      <div className="flex gap-3 justify-end">
        <Link
          href={mode === 'edit' && initialData?.slug ? `/prm/${initialData.slug}` : '/prm'}
          className="btn btn-ghost"
        >
          {readMode ? 'Zurück' : 'Abbrechen'}
        </Link>
        {!readMode && (
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving && <span className="loading loading-spinner loading-xs"></span>}
            {mode === 'edit' ? 'Speichern' : 'Kontakt erstellen'}
          </button>
        )}
      </div>
    </form>
  )
}
