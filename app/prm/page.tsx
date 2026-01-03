import ContactList from '@/components/ContactList'
import GoogleSyncStatus from '@/components/GoogleSyncStatus'
import { getContacts } from '@/lib/prm'
import { cookies } from 'next/headers'

export default function PRMPage() {
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <ServerContactList />
        <div className="space-y-4">
          <GoogleSyncStatus />
        </div>
      </div>
    </div>
  )
}

async function ServerContactList() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) return <ContactList />

  const { contacts, total } = await getContacts(userId, {
    limit: 24,
    offset: 0,
    sortBy: 'givenName',
    sortOrder: 'asc',
    summary: true
  })

  // Prisma objects need to be serialized (dates, etc.)
  const serializedContacts = JSON.parse(JSON.stringify(contacts))

  return <ContactList initialContacts={serializedContacts} initialTotal={total} />
}
