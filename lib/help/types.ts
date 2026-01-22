/**
 * Help System Types
 * Defines the structure for help content, categories, and topics.
 */

export interface HelpTopic {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  keywords: string[]
}

export interface HelpCategory {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  topics: HelpTopic[]
}

export interface HelpContent {
  summary: string
  instructions: string
  technical: string
}

export interface HelpSearchResult {
  categorySlug: string
  categoryTitle: string
  topicSlug: string
  topicTitle: string
  topicDescription: string
  icon: string
  matchScore: number
}
