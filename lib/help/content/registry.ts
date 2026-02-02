/**
 * Help Content Registry
 * Aggregates all content from category-specific files.
 */

import type { TopicContent } from './index'
import { ersteSchritteContent, ersteSchritteOverview } from './01-erste-schritte'
import { tagebuchContent, tagebuchOverview } from './02-tagebuch'
import { auswertungenContent, auswertungenOverview } from './03-auswertungen'
import { actEntwicklungContent, actEntwicklungOverview } from './04-act-entwicklung'
import { personenOrteContent, personenOrteOverview } from './05-personen-orte'
import { aufgabenContent, aufgabenOverview } from './06-aufgaben'
import { kiFeaturesContent, kiFeaturesOverview } from './07-ki-features'
import { datenSyncContent, datenSyncOverview } from './08-daten-sync'
import { einstellungenContent, einstellungenOverview } from './09-einstellungen'
import { templatesContent, templatesOverview } from './10-templates'

type ContentRegistry = Record<string, Record<string, TopicContent>>

const helpContent: ContentRegistry = {
  'erste-schritte': ersteSchritteContent,
  'tagebuch': tagebuchContent,
  'auswertungen': auswertungenContent,
  'act-entwicklung': actEntwicklungContent,
  'personen-orte': personenOrteContent,
  'aufgaben': aufgabenContent,
  'ki-features': kiFeaturesContent,
  'daten-sync': datenSyncContent,
  'einstellungen': einstellungenContent,
  'templates': templatesContent,
}

export const categoryOverviews: Record<string, string> = {
  'erste-schritte': ersteSchritteOverview,
  'tagebuch': tagebuchOverview,
  'auswertungen': auswertungenOverview,
  'act-entwicklung': actEntwicklungOverview,
  'personen-orte': personenOrteOverview,
  'aufgaben': aufgabenOverview,
  'ki-features': kiFeaturesOverview,
  'daten-sync': datenSyncOverview,
  'einstellungen': einstellungenOverview,
  'templates': templatesOverview,
}

/**
 * Get content for a specific topic
 */
export function getTopicContent(categorySlug: string, topicSlug: string): TopicContent | null {
  const category = helpContent[categorySlug]
  if (!category) return null
  return category[topicSlug] || null
}

/**
 * Get overview content for a category
 */
export function getCategoryOverview(categorySlug: string): string | null {
  return categoryOverviews[categorySlug] || null
}
