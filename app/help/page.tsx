import Link from 'next/link'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { HelpSearch } from '@/components/features/help/HelpSearch'
import { HelpCard } from '@/components/features/help/HelpContent'
import { helpCategories } from '@/lib/help/helpStructure'

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">CompACT Diary Hilfe</h1>
        <p className="text-base-content/70">
          Willkommen im Hilfe-Center. Hier findest du Anleitungen und Informationen zu allen Funktionen.
        </p>
        <div className="flex justify-center">
          <HelpSearch />
        </div>
      </div>

      {/* Quick Links */}
      <div className="card bg-base-200 p-4">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <TablerIcon name="bolt" size={18} />
          Schnellstart
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/help/erste-schritte/einfuehrung"
            className="btn btn-sm btn-outline justify-start"
          >
            <TablerIcon name="info" size={16} />
            Einführung
          </Link>
          <Link
            href="/help/erste-schritte/schnellstart"
            className="btn btn-sm btn-outline justify-start"
          >
            <TablerIcon name="bolt" size={16} />
            Schnellstart-Guide
          </Link>
          <Link
            href="/help/erste-schritte/installation"
            className="btn btn-sm btn-outline justify-start"
          >
            <TablerIcon name="download" size={16} />
            App installieren
          </Link>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className="font-medium mb-4">Alle Hilfe-Kategorien</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpCategories.map((category) => (
            <HelpCard
              key={category.id}
              title={category.title}
              description={category.description}
              icon={category.icon}
              href={`/help/${category.slug}`}
            />
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="card bg-base-200 p-4">
        <h2 className="font-medium mb-2 flex items-center gap-2">
          <TablerIcon name="message_circle" size={18} />
          Weitere Hilfe
        </h2>
        <p className="text-sm text-base-content/70">
          Findest du nicht, was du suchst? Nutze die Suchfunktion oben oder kontaktiere uns.
        </p>
      </div>
    </div>
  )
}
