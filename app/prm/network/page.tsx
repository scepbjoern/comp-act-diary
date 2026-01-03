'use client'

import { useState, useEffect } from 'react'
import { IconArrowLeft, IconNetwork } from '@tabler/icons-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const RelationshipGraph = dynamic(
  () => import('@/components/RelationshipGraph'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }
)

interface Contact {
  id: string
  slug: string
  name: string
  isFavorite: boolean
}

interface Relation {
  id: string
  personAId: string
  personBId: string
  relationType: string
}

export default function NetworkPage() {
  const searchParams = useSearchParams()
  const focusContactId = searchParams.get('focus')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/contacts?includeRelations=true&limit=1000')
        const data = await res.json()
        
        if (data.contacts) {
          setContacts(data.contacts.map((c: Contact & { relationsAsA?: Relation[]; relationsAsB?: Relation[] }) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            isFavorite: c.isFavorite,
          })))
          
          // Extract unique relations from all contacts
          const allRelations: Relation[] = []
          const seenIds = new Set<string>()
          
          for (const contact of data.contacts) {
            if (contact.relationsAsA) {
              for (const rel of contact.relationsAsA) {
                if (!seenIds.has(rel.id)) {
                  seenIds.add(rel.id)
                  allRelations.push({
                    id: rel.id,
                    personAId: rel.personAId,
                    personBId: rel.personBId,
                    relationType: rel.relationType,
                  })
                }
              }
            }
            if (contact.relationsAsB) {
              for (const rel of contact.relationsAsB) {
                if (!seenIds.has(rel.id)) {
                  seenIds.add(rel.id)
                  allRelations.push({
                    id: rel.id,
                    personAId: rel.personAId,
                    personBId: rel.personBId,
                    relationType: rel.relationType,
                  })
                }
              }
            }
          }
          
          setRelations(allRelations)
        }
      } catch (error) {
        console.error('Error fetching network data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <div className="flex items-center gap-3">
          <Link href="/prm" className="btn btn-ghost btn-sm">
            <IconArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <IconNetwork size={24} />
            Beziehungsnetzwerk
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          {contacts.length} Kontakte • {relations.length} Beziehungen
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <RelationshipGraph contacts={contacts} relations={relations} focusContactId={focusContactId} />
        )}
      </div>
    </div>
  )
}
