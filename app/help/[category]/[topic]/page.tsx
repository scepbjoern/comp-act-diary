import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TablerIcon } from '@/components/ui/TablerIcon'
import { HelpNavigation, HelpBreadcrumb } from '@/components/features/help/HelpNavigation'
import { HelpContent } from '@/components/features/help/HelpContent'
import { findCategory, findTopic, helpCategories } from '@/lib/help/helpStructure'
import { getTopicContent } from '@/lib/help/content'

interface TopicPageProps {
  params: Promise<{ category: string; topic: string }>
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { category: categorySlug, topic: topicSlug } = await params
  const category = findCategory(categorySlug)
  const topic = findTopic(categorySlug, topicSlug)

  if (!category || !topic) {
    notFound()
  }

  const content = getTopicContent(categorySlug, topicSlug)

  if (!content) {
    notFound()
  }

  // Find previous and next topics for navigation
  const allTopics = helpCategories.flatMap((cat) =>
    cat.topics.map((t) => ({ category: cat, topic: t }))
  )
  const currentIndex = allTopics.findIndex(
    (item) => item.category.slug === categorySlug && item.topic.slug === topicSlug
  )
  const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null
  const nextTopic = currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <HelpNavigation currentCategory={categorySlug} currentTopic={topicSlug} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <HelpBreadcrumb
            categorySlug={categorySlug}
            categoryTitle={category.title}
            topicTitle={topic.title}
          />

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <TablerIcon name={topic.icon} size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{topic.title}</h1>
                <p className="text-base-content/70">{topic.description}</p>
              </div>
            </div>

            {/* Content Tabs */}
            <HelpContent
              summary={content.summary}
              instructions={content.instructions}
              technical={content.technical}
            />

            {/* Navigation */}
            <div className="pt-6 border-t border-base-300">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {prevTopic ? (
                  <Link
                    href={`/help/${prevTopic.category.slug}/${prevTopic.topic.slug}`}
                    className="btn btn-ghost btn-sm justify-start"
                  >
                    <TablerIcon name="arrow_left" size={16} />
                    <span className="truncate">{prevTopic.topic.title}</span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextTopic ? (
                  <Link
                    href={`/help/${nextTopic.category.slug}/${nextTopic.topic.slug}`}
                    className="btn btn-ghost btn-sm justify-end"
                  >
                    <span className="truncate">{nextTopic.topic.title}</span>
                    <TablerIcon name="arrow_right" size={16} />
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </div>

            {/* Back to Category */}
            <div>
              <Link href={`/help/${categorySlug}`} className="btn btn-outline btn-sm">
                <TablerIcon name="arrow_left" size={16} />
                Zurück zu {category.title}
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
  const params: { category: string; topic: string }[] = []

  for (const category of helpCategories) {
    for (const topic of category.topics) {
      params.push({
        category: category.slug,
        topic: topic.slug,
      })
    }
  }

  return params
}
