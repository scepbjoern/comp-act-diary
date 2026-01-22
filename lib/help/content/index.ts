/**
 * Help Content Index
 * Exports all help content from category-specific files.
 */

export interface TopicContent {
  summary: string
  instructions: string
  technical: string
}

export { categoryOverviews, getTopicContent, getCategoryOverview } from './registry'
