import ContactForm from '@/components/ContactForm'

export default function NewContactPage() {
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <ContactForm mode="create" />
    </div>
  )
}
