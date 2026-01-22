'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { helpCategories } from '@/lib/help/helpStructure'

interface HelpNavigationProps {
  currentCategory?: string
  currentTopic?: string
  showTopics?: boolean
}

export function HelpNavigation({ currentCategory, currentTopic, showTopics = true }: HelpNavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      <Link
        href="/help"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          pathname === '/help' ? 'bg-primary/20 text-primary' : 'hover:bg-base-200'
        }`}
      >
        <TablerIcon name="help" size={18} />
        <span className="font-medium">Hilfe-Übersicht</span>
      </Link>

      <div className="border-t border-base-300 my-3" />

      {helpCategories.map((category) => (
        <div key={category.id} className="space-y-1">
          <Link
            href={`/help/${category.slug}`}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              currentCategory === category.slug
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-base-200'
            }`}
          >
            <TablerIcon name={category.icon} size={18} />
            <span className="font-medium text-sm">{category.title}</span>
          </Link>

          {showTopics && currentCategory === category.slug && (
            <div className="ml-6 space-y-1 border-l-2 border-base-300 pl-3">
              {category.topics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/help/${category.slug}/${topic.slug}`}
                  className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                    currentTopic === topic.slug
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                  }`}
                >
                  {topic.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

export function HelpBreadcrumb({ 
  categorySlug, 
  categoryTitle, 
  topicTitle 
}: { 
  categorySlug?: string
  categoryTitle?: string
  topicTitle?: string 
}) {
  return (
    <div className="text-sm breadcrumbs mb-4">
      <ul>
        <li>
          <Link href="/help" className="flex items-center gap-1">
            <TablerIcon name="help" size={14} />
            Hilfe
          </Link>
        </li>
        {categorySlug && categoryTitle && (
          <li>
            <Link href={`/help/${categorySlug}`}>{categoryTitle}</Link>
          </li>
        )}
        {topicTitle && <li>{topicTitle}</li>}
      </ul>
    </div>
  )
}
