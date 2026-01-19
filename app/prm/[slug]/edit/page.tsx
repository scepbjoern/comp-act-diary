import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ContactForm from '@/components/features/contacts/ContactForm'

async function getContact(slug: string) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  
  if (!userId) return null

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    const res = await fetch(`${baseUrl}/api/contacts/${slug}`, {
      headers: {
        Cookie: `userId=${userId}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) return null
    
    const data = await res.json()
    return data.contact
  } catch (error) {
    console.error('Error fetching contact:', error)
    return null
  }
}

export default async function EditContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const contact = await getContact(slug)

  if (!contact) {
    notFound()
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <ContactForm mode="edit" initialData={contact} />
    </div>
  )
}
