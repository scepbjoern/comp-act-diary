import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { HelpNavigation, HelpBreadcrumb } from '@/components/features/help/HelpNavigation'
import { HelpTopicCard } from '@/components/features/help/HelpContent'
import { findCategory } from '@/lib/help/helpStructure'
import { getCategoryOverview } from '@/lib/help/content'

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params
  const category = findCategory(categorySlug)

  if (!category) {
    notFound()
  }

  const overview = getCategoryOverview(categorySlug)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <HelpNavigation currentCategory={categorySlug} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <HelpBreadcrumb categorySlug={categorySlug} categoryTitle={category.title} />

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <TablerIcon name={category.icon} size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{category.title}</h1>
                <p className="text-base-content/70">{category.description}</p>
              </div>
            </div>

            {/* Overview */}
            {overview && (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: overview }}
              />
            )}

            {/* Topics */}
            <div>
              <h2 className="font-medium mb-4">Themen in dieser Kategorie</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.topics.map((topic) => (
                  <HelpTopicCard
                    key={topic.id}
                    title={topic.title}
                    description={topic.description}
                    icon={topic.icon}
                    href={`/help/${categorySlug}/${topic.slug}`}
                  />
                ))}
              </div>
            </div>

            {/* Back Link */}
            <div className="pt-4 border-t border-base-300">
              <Link href="/help" className="btn btn-ghost btn-sm">
                <TablerIcon name="arrow_left" size={16} />
                Zurück zur Übersicht
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  const { helpCategories } = await import('@/lib/help/helpStructure')
  return helpCategories.map((category) => ({
    category: category.slug,
  }))
}
