'use client'

import { IconStar, IconStarFilled, IconUser, IconPhone, IconMail, IconBriefcase } from '@tabler/icons-react'
import Link from 'next/link'
import { useReadMode } from '@/hooks/useReadMode'

interface ContactCardProps {
  contact: {
    id: string
    slug: string
    name: string
    givenName?: string | null
    familyName?: string | null
    emailPrivate?: string | null
    emailWork?: string | null
    phonePrivate?: string | null
    phoneWork?: string | null
    company?: string | null
    jobTitle?: string | null
    isFavorite: boolean
    googleResourceName?: string | null
    photoUrl?: string | null
  }
  onToggleFavorite?: (id: string) => void
}

export default function ContactCard({ contact, onToggleFavorite }: ContactCardProps) {
  const { readMode } = useReadMode()
  const email = contact.emailPrivate || contact.emailWork
  const phone = contact.phonePrivate || contact.phoneWork
  const hasGoogleSync = Boolean(contact.googleResourceName)

  return (
    <Link
      href={`/prm/${contact.slug}`}
      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-200"
    >
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className="avatar placeholder">
            {contact.photoUrl ? (
              <div className="rounded-full w-12 h-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={contact.photoUrl} alt={contact.name} className="rounded-full object-cover w-full h-full" />
              </div>
            ) : (
              <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center">
                <IconUser size={24} />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{contact.name}</h3>
              {hasGoogleSync && (
                <span className="badge badge-xs badge-info" title="Mit Google synchronisiert">G</span>
              )}
            </div>
            
            {(contact.company || contact.jobTitle) && (
              <p className="text-sm text-base-content/60 truncate flex items-center gap-1">
                <IconBriefcase size={14} />
                {contact.jobTitle && contact.company 
                  ? `${contact.jobTitle} bei ${contact.company}`
                  : contact.jobTitle || contact.company}
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-base-content/70">
              {email && (
                <span className="flex items-center gap-1">
                  <IconMail size={12} />
                  <span className="truncate max-w-[150px]">{email}</span>
                </span>
              )}
              {phone && (
                <span className="flex items-center gap-1">
                  <IconPhone size={12} />
                  {phone}
                </span>
              )}
            </div>
          </div>
          
          {/* Hide favorite toggle in read mode, show static star for favorites */}
          {readMode ? (
            contact.isFavorite && <IconStarFilled size={18} className="text-warning" />
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite?.(contact.id)
              }}
              className="btn btn-ghost btn-sm btn-circle"
              title={contact.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              {contact.isFavorite ? (
                <IconStarFilled size={18} className="text-warning" />
              ) : (
                <IconStar size={18} />
              )}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
