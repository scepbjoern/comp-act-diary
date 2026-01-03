'use client'

import { useState, useMemo } from 'react'
import { 
  IconUser, IconMail, IconPhone, IconMapPin, IconBriefcase, IconWorld,
  IconStar, IconStarFilled, IconEdit, IconTrash, IconArrowLeft,
  IconCake, IconCalendar, IconLink, IconBrandGoogle, IconArchive, IconCloudUpload, IconNetwork
} from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import RelationEditor from './RelationEditor'
import InteractionEditor from './InteractionEditor'
import TaskForm from './TaskForm'
import ContactPhotoUpload from './ContactPhotoUpload'
import ContactGroupsEditor from './ContactGroupsEditor'

interface Contact {
  id: string
  slug: string
  name: string
  givenName?: string | null
  familyName?: string | null
  nickname?: string | null
  emailPrivate?: string | null
  emailWork?: string | null
  phonePrivate?: string | null
  phoneWork?: string | null
  addressHome?: string | null
  addressWork?: string | null
  company?: string | null
  jobTitle?: string | null
  birthday?: string | null
  firstMetAt?: string | null
  notes?: string | null
  websiteUrl?: string | null
  socialUrls?: Array<{ type: string; url: string }> | null
  isFavorite: boolean
  googleResourceName?: string | null
  photoUrl?: string | null
  relationshipLevel?: number | null
  relationsAsA?: Array<{ id: string; relationType: string; personB: { id: string; name: string; slug: string } }>
  relationsAsB?: Array<{ id: string; relationType: string; personA: { id: string; name: string; slug: string } }>
  interactions?: Array<{ id: string; kind: string; notes?: string | null; occurredAt: string }>
  tasks?: Array<{ id: string; title: string; status: string; dueDate?: string | null }>
}

interface ContactDetailsProps {
  contact: Contact
}

interface RelationWithPerson {
  id: string
  relationType: string
  person: { id: string; name: string; slug: string }
  direction: 'to' | 'from'
}

export default function ContactDetails({ contact }: ContactDetailsProps) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(contact.isFavorite)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRelationEditor, setShowRelationEditor] = useState(false)
  const [showInteractionEditor, setShowInteractionEditor] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [pushingToGoogle, setPushingToGoogle] = useState(false)

  const handlePushToGoogle = async () => {
    setPushingToGoogle(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/push-to-google`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        alert(data.isNew ? 'Kontakt wurde zu Google hinzugefügt!' : 'Kontakt wurde in Google aktualisiert!')
        router.refresh()
      } else {
        const error = await res.json()
        alert(`Fehler: ${error.error || 'Unbekannter Fehler'}`)
      }
    } catch (error) {
      console.error('Error pushing to Google:', error)
      alert('Fehler beim Hochladen zu Google')
    } finally {
      setPushingToGoogle(false)
    }
  }

  const handleToggleFavorite = async () => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleFavorite' }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsFavorite(data.isFavorite)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Möchtest du diesen Kontakt archivieren?')) return
    
    setArchiving(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      })
      if (res.ok) {
        router.push('/prm')
      }
    } catch (error) {
      console.error('Error archiving contact:', error)
    } finally {
      setArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Möchtest du diesen Kontakt PERMANENT löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/prm')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
    } finally {
      setDeleting(false)
    }
  }

  const allRelations = useMemo(() => [
    ...(contact.relationsAsA || []).map(r => ({ ...r, person: r.personB, direction: 'to' as const })),
    ...(contact.relationsAsB || []).map(r => ({ ...r, person: r.personA, direction: 'from' as const })),
  ], [contact.relationsAsA, contact.relationsAsB])

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const action = currentStatus === 'COMPLETED' ? 'reopen' : 'complete'
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/prm" className="btn btn-ghost btn-sm btn-circle mt-1">
          <IconArrowLeft size={20} />
        </Link>
        
        <ContactPhotoUpload 
          contactId={contact.id} 
          currentPhotoUrl={contact.photoUrl}
          onPhotoChange={() => router.refresh()}
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            {contact.googleResourceName && (
              <span className="badge badge-info gap-1">
                <IconBrandGoogle size={12} />
                Google
              </span>
            )}
          </div>
          {contact.nickname && (
            <p className="text-base-content/60">&quot;{contact.nickname}&quot;</p>
          )}
          {(contact.company || contact.jobTitle) && (
            <p className="text-sm text-base-content/70 flex items-center gap-1 mt-1">
              <IconBriefcase size={14} />
              {contact.jobTitle && contact.company 
                ? `${contact.jobTitle} bei ${contact.company}`
                : contact.jobTitle || contact.company}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleToggleFavorite}
            className="btn btn-ghost btn-sm btn-circle"
            title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          >
            {isFavorite ? (
              <IconStarFilled size={20} className="text-warning" />
            ) : (
              <IconStar size={20} />
            )}
          </button>
          <Link href={`/prm/${contact.slug}/edit`} className="btn btn-ghost btn-sm btn-circle">
            <IconEdit size={20} />
          </Link>
          <button
            onClick={handlePushToGoogle}
            className="btn btn-ghost btn-sm btn-circle text-info"
            disabled={pushingToGoogle}
            title="Zu Google hochladen"
          >
            {pushingToGoogle ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <IconCloudUpload size={20} />
            )}
          </button>
          <button
            onClick={handleArchive}
            className="btn btn-ghost btn-sm btn-circle text-warning"
            disabled={archiving}
            title="Archivieren"
          >
            <IconArchive size={20} />
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-ghost btn-sm btn-circle text-error"
            disabled={deleting}
            title="Permanent löschen"
          >
            <IconTrash size={20} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">Kontaktdaten</h2>
            
            <div className="space-y-3 mt-2">
              {contact.emailPrivate && (
                <div className="flex items-center gap-3">
                  <IconMail size={18} className="text-base-content/50" />
                  <div>
                    <a href={`mailto:${contact.emailPrivate}`} className="link link-primary">
                      {contact.emailPrivate}
                    </a>
                    <span className="text-xs text-base-content/50 ml-2">Privat</span>
                  </div>
                </div>
              )}
              {contact.emailWork && (
                <div className="flex items-center gap-3">
                  <IconMail size={18} className="text-base-content/50" />
                  <div>
                    <a href={`mailto:${contact.emailWork}`} className="link link-primary">
                      {contact.emailWork}
                    </a>
                    <span className="text-xs text-base-content/50 ml-2">Geschäftlich</span>
                  </div>
                </div>
              )}
              {contact.phonePrivate && (
                <div className="flex items-center gap-3">
                  <IconPhone size={18} className="text-base-content/50" />
                  <div>
                    <a href={`tel:${contact.phonePrivate}`} className="link link-primary">
                      {contact.phonePrivate}
                    </a>
                    <span className="text-xs text-base-content/50 ml-2">Privat</span>
                  </div>
                </div>
              )}
              {contact.phoneWork && (
                <div className="flex items-center gap-3">
                  <IconPhone size={18} className="text-base-content/50" />
                  <div>
                    <a href={`tel:${contact.phoneWork}`} className="link link-primary">
                      {contact.phoneWork}
                    </a>
                    <span className="text-xs text-base-content/50 ml-2">Geschäftlich</span>
                  </div>
                </div>
              )}
              {contact.addressHome && (
                <div className="flex items-start gap-3">
                  <IconMapPin size={18} className="text-base-content/50 mt-0.5" />
                  <div>
                    <p className="whitespace-pre-line">{contact.addressHome}</p>
                    <span className="text-xs text-base-content/50">Privat</span>
                  </div>
                </div>
              )}
              {contact.addressWork && (
                <div className="flex items-start gap-3">
                  <IconMapPin size={18} className="text-base-content/50 mt-0.5" />
                  <div>
                    <p className="whitespace-pre-line">{contact.addressWork}</p>
                    <span className="text-xs text-base-content/50">Geschäftlich</span>
                  </div>
                </div>
              )}
              {contact.websiteUrl && (
                <div className="flex items-center gap-3">
                  <IconWorld size={18} className="text-base-content/50" />
                  <a href={contact.websiteUrl} target="_blank" rel="noopener noreferrer" className="link link-primary">
                    {contact.websiteUrl}
                  </a>
                </div>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-3">
                  <IconCake size={18} className="text-base-content/50" />
                  <span>{format(new Date(contact.birthday), 'd. MMMM yyyy', { locale: de })}</span>
                </div>
              )}
              {contact.firstMetAt && (
                <div className="flex items-center gap-3">
                  <IconCalendar size={18} className="text-base-content/50" />
                  <span>Kennengelernt: {format(new Date(contact.firstMetAt), 'd. MMMM yyyy', { locale: de })}</span>
                </div>
              )}
            </div>

            {contact.socialUrls && contact.socialUrls.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-sm text-base-content/70 mb-2">Social Media</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.socialUrls.map((social, i) => (
                    <a
                      key={i}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="badge badge-outline gap-1"
                    >
                      <IconLink size={12} />
                      {social.type}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Groups */}
            <div className="mt-4 pt-4 border-t border-base-200">
              <ContactGroupsEditor contactId={contact.id} />
            </div>
          </div>
        </div>

        {/* Relations */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title text-lg">Beziehungen</h2>
              <div className="flex gap-2">
                <Link 
                  href={`/prm/network?focus=${contact.id}`}
                  className="btn btn-sm btn-ghost"
                  title="Im Netzwerk anzeigen"
                >
                  <IconNetwork size={16} />
                </Link>
                <button className="btn btn-sm btn-primary" onClick={() => setShowRelationEditor(true)}>
                  + Beziehung
                </button>
              </div>
            </div>
            
            {allRelations.length === 0 ? (
              <p className="text-base-content/60 text-sm">Keine Beziehungen erfasst</p>
            ) : (
              <div className="space-y-2 mt-2">
                {allRelations.map((rel: RelationWithPerson) => (
                  <Link
                    key={rel.id}
                    href={`/prm/${rel.person.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <div className="avatar placeholder">
                      <div className="bg-base-300 rounded-full w-8 h-8">
                        <IconUser size={16} />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{rel.person.name}</p>
                      <p className="text-xs text-base-content/60">{rel.relationType}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="card bg-base-100 shadow-sm border border-base-200 lg:col-span-2">
            <div className="card-body">
              <h2 className="card-title text-lg">Notizen</h2>
              <p className="whitespace-pre-line">{contact.notes}</p>
            </div>
          </div>
        )}

        {/* Recent Interactions */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title text-lg">Letzte Interaktionen</h2>
              <button className="btn btn-sm btn-primary" onClick={() => setShowInteractionEditor(true)}>
                + Interaktion
              </button>
            </div>
            {contact.interactions && contact.interactions.length > 0 ? (
              <div className="space-y-2 mt-2">
                {contact.interactions.slice(0, 5).map((interaction) => {
                  const dateStr = format(new Date(interaction.occurredAt), 'yyyy-MM-dd')
                  return (
                    <Link
                      key={interaction.id}
                      href={`/day/${dateStr}`}
                      className="flex justify-between items-start p-2 bg-base-200/50 rounded-lg hover:bg-base-300/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="badge badge-sm">{interaction.kind}</span>
                        {interaction.notes && (
                          <p className="text-sm mt-1 text-base-content/70">{interaction.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-base-content/50">
                        {format(new Date(interaction.occurredAt), 'd.M.yy', { locale: de })}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-base-content/60 text-sm">Keine Interaktionen vorhanden</p>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title text-lg">Aufgaben</h2>
              <button className="btn btn-sm btn-primary" onClick={() => setShowTaskForm(true)}>
                + Aufgabe
              </button>
            </div>
            {contact.tasks && contact.tasks.length > 0 ? (
              <div className="space-y-2 mt-2">
                {contact.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 bg-base-200/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={task.status === 'COMPLETED'}
                      onChange={() => handleToggleTask(task.id, task.status)}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className={task.status === 'COMPLETED' ? 'line-through text-base-content/50' : ''}>
                        {task.title}
                      </p>
                      {task.dueDate && (
                        <span className="text-xs text-base-content/50">
                          Fällig: {format(new Date(task.dueDate), 'd.M.yy', { locale: de })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base-content/60 text-sm">Keine Aufgaben vorhanden</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRelationEditor && (
        <RelationEditor
          contactId={contact.id}
          contactName={contact.name}
          existingRelations={allRelations.map(r => ({
            id: r.id,
            relationType: r.relationType,
            personB: r.person
          }))}
          onClose={() => setShowRelationEditor(false)}
          onSave={() => {
            setShowRelationEditor(false)
            router.refresh()
          }}
        />
      )}
      {showInteractionEditor && (
        <InteractionEditor
          contactId={contact.id}
          contactName={contact.name}
          onClose={() => setShowInteractionEditor(false)}
          onSave={() => {
            setShowInteractionEditor(false)
            router.refresh()
          }}
        />
      )}
      {showTaskForm && (
        <TaskForm
          contactId={contact.id}
          onClose={() => setShowTaskForm(false)}
          onSave={() => {
            setShowTaskForm(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
