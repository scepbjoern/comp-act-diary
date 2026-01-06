/**
 * Zod-Schemas und Typen für die Volltextsuche.
 * Definiert Query-Parameter-Validierung und suchbare Entitätstypen.
 */
import { z } from 'zod';

// All searchable entity types (11 types, without DayEntry and MediaAsset)
export const searchableEntityTypes = [
  'journal_entry',
  'contact',
  'location',
  'taxonomy',
  'task',
  'act_value',
  'act_goal',
  'habit',
  'bookmark',
  'calendar_event',
  'consumption',
] as const;

export type SearchableEntityType = (typeof searchableEntityTypes)[number];

// Human-readable labels for each entity type
export const entityTypeLabels: Record<SearchableEntityType, string> = {
  journal_entry: 'Journal',
  contact: 'Kontakte',
  location: 'Orte',
  taxonomy: 'Tags',
  task: 'Aufgaben',
  act_value: 'Werte',
  act_goal: 'Ziele',
  habit: 'Gewohnheiten',
  bookmark: 'Lesezeichen',
  calendar_event: 'Termine',
  consumption: 'Medien',
};

// Icons for each entity type (Tabler icon names)
export const entityTypeIcons: Record<SearchableEntityType, string> = {
  journal_entry: 'notebook',
  contact: 'user',
  location: 'map-pin',
  taxonomy: 'tag',
  task: 'checkbox',
  act_value: 'heart',
  act_goal: 'target',
  habit: 'repeat',
  bookmark: 'bookmark',
  calendar_event: 'calendar',
  consumption: 'movie',
};

// Query parameter schema for GET /api/search
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(2, 'Suchbegriff muss mindestens 2 Zeichen haben')
    .max(200, 'Suchbegriff darf maximal 200 Zeichen haben'),
  types: z
    .array(z.enum(searchableEntityTypes))
    .optional()
    .default([...searchableEntityTypes]),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit muss mindestens 1 sein')
    .max(100, 'Limit darf maximal 100 sein')
    .default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
