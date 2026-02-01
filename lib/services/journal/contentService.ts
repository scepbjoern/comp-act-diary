/**
 * lib/services/journal/contentService.ts
 * Service for content aggregation (fields → Markdown with H1 headers)
 * and parsing (Markdown → field values).
 */

import { TemplateField, ParsedField, ContentParseResult } from '@/types/journal'

// =============================================================================
// CONTENT BUILDING (Fields → Markdown)
// =============================================================================

/**
 * Builds markdown content from field values using H1 headers.
 * Each field with a label becomes a section with an H1 header.
 * For minimal templates (1 field without label), content is returned directly.
 *
 * @param fields - Template field definitions
 * @param values - Field values keyed by field ID
 * @returns Aggregated markdown content
 *
 * @example
 * // Multi-field template:
 * // "# Was hat sich verändert?\n\nText für Feld 1\n\n# Wofür bin ich dankbar?\n\nText für Feld 2"
 *
 * @example
 * // Minimal template (1 field without label):
 * // "Direct content without headers"
 */
export function buildContentFromFields(
  fields: TemplateField[],
  values: Record<string, string>
): string {
  if (!fields || fields.length === 0) {
    // No fields defined - return first value or empty string
    const firstValue = Object.values(values)[0]
    return firstValue || ''
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  // Check if this is a minimal template (1 field without label)
  if (sortedFields.length === 1 && !sortedFields[0].label) {
    return values[sortedFields[0].id] || ''
  }

  // Build sections with H1 headers
  const sections: string[] = []

  for (const field of sortedFields) {
    const value = values[field.id] || ''

    // Skip empty optional fields
    if (!value && !field.required) {
      continue
    }

    if (field.label) {
      // Field with label → H1 header section
      const header = field.icon ? `# ${field.icon} ${field.label}` : `# ${field.label}`
      sections.push(`${header}\n\n${value}`)
    } else {
      // Field without label → content directly
      sections.push(value)
    }
  }

  return sections.join('\n\n')
}

// =============================================================================
// CONTENT PARSING (Markdown → Fields)
// =============================================================================

// Regex to match H1 headers (with optional emoji prefix)
const H1_REGEX = /^#\s+(?:(\p{Emoji})\s+)?(.+)$/mu

/**
 * Parses markdown content back into field values.
 * Attempts to match H1 headers with template field labels.
 *
 * @param content - Markdown content to parse
 * @param fields - Template field definitions
 * @returns Parse result with matched fields and success indicator
 */
export function parseContentToFields(
  content: string,
  fields: TemplateField[]
): ContentParseResult {
  if (!fields || fields.length === 0) {
    return {
      matched: true,
      fields: [],
    }
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  // Check if this is a minimal template (1 field without label)
  if (sortedFields.length === 1 && !sortedFields[0].label) {
    return {
      matched: true,
      fields: [
        {
          ...sortedFields[0],
          value: content,
        },
      ],
    }
  }

  // Split content by H1 headers
  const sections = splitByHeaders(content)

  // Try to match sections to fields
  const parsedFields: ParsedField[] = []
  const unmatchedFields: TemplateField[] = []
  let hasWarning = false

  for (const field of sortedFields) {
    if (!field.label) {
      // Field without label - skip matching
      parsedFields.push({ ...field, value: '' })
      continue
    }

    // Try to find matching section
    const matchedSection = findMatchingSection(sections, field)

    if (matchedSection !== null) {
      parsedFields.push({
        ...field,
        value: matchedSection,
      })
    } else {
      // No match found
      parsedFields.push({ ...field, value: '' })
      unmatchedFields.push(field)
      // Only set warning for required fields that are missing
      if (field.required) {
        hasWarning = true
      }
    }
  }

  // Check if content has expected structure (H1 headers for multi-field templates)
  const labeledFields = sortedFields.filter((f) => f.label)
  const hasExpectedHeaders = labeledFields.length > 1 ? sections.some((s) => s.header) : true
  const structureMatches = hasExpectedHeaders

  return {
    matched: !hasWarning && structureMatches,
    fields: parsedFields,
    warning: hasWarning
      ? `Pflichtfelder ohne Übereinstimmung: ${unmatchedFields.filter((f) => f.required).map((f) => f.label).join(', ')}`
      : undefined,
  }
}

/**
 * Splits content by H1 headers into sections.
 * Returns array of { header, content } objects.
 */
function splitByHeaders(content: string): Array<{ header: string; icon?: string; content: string }> {
  const lines = content.split('\n')
  const sections: Array<{ header: string; icon?: string; content: string }> = []

  let currentHeader = ''
  let currentIcon: string | undefined
  let currentContent: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(H1_REGEX)

    if (headerMatch) {
      // Save previous section if any
      if (currentHeader || currentContent.length > 0) {
        sections.push({
          header: currentHeader,
          icon: currentIcon,
          content: currentContent.join('\n').trim(),
        })
      }

      // Start new section
      currentIcon = headerMatch[1]
      currentHeader = headerMatch[2].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentHeader || currentContent.length > 0) {
    sections.push({
      header: currentHeader,
      icon: currentIcon,
      content: currentContent.join('\n').trim(),
    })
  }

  return sections
}

/**
 * Finds a section that matches a field.
 * Matches by label (exact or fuzzy) and optionally by icon.
 */
function findMatchingSection(
  sections: Array<{ header: string; icon?: string; content: string }>,
  field: TemplateField
): string | null {
  if (!field.label) return null

  // Normalize label for comparison
  const normalizedLabel = normalizeForComparison(field.label)

  for (const section of sections) {
    const normalizedHeader = normalizeForComparison(section.header)

    // Check for exact match
    if (normalizedHeader === normalizedLabel) {
      return section.content
    }

    // Check for fuzzy match (header contains label or vice versa)
    if (normalizedHeader.includes(normalizedLabel) || normalizedLabel.includes(normalizedHeader)) {
      return section.content
    }

    // Check icon match if both have icons
    if (field.icon && section.icon && field.icon === section.icon) {
      return section.content
    }
  }

  return null
}

/**
 * Normalizes a string for comparison.
 * Removes extra whitespace, converts to lowercase.
 */
function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim()
}

// =============================================================================
// FIELD VALUES EXTRACTION
// =============================================================================

/**
 * Extracts field values from parsed fields as a Record.
 * Useful for form initialization.
 */
export function extractFieldValues(parsedFields: ParsedField[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of parsedFields) {
    values[field.id] = field.value
  }
  return values
}

/**
 * Checks if content matches template structure.
 * Quick check without full parsing.
 */
export function contentMatchesTemplate(content: string, fields: TemplateField[]): boolean {
  const result = parseContentToFields(content, fields)
  return result.matched
}

// =============================================================================
// CONTENT TRANSFORMATION
// =============================================================================

/**
 * Updates a specific field value in existing content.
 * Parses content, updates the field, and rebuilds.
 */
export function updateFieldInContent(
  content: string,
  fields: TemplateField[],
  fieldId: string,
  newValue: string
): string {
  const parsed = parseContentToFields(content, fields)
  const values = extractFieldValues(parsed.fields)
  values[fieldId] = newValue
  return buildContentFromFields(fields, values)
}

/**
 * Merges new field values into existing content.
 * Only updates fields that are provided in newValues.
 */
export function mergeFieldValues(
  content: string,
  fields: TemplateField[],
  newValues: Record<string, string>
): string {
  const parsed = parseContentToFields(content, fields)
  const values = extractFieldValues(parsed.fields)

  // Merge new values
  for (const [key, value] of Object.entries(newValues)) {
    values[key] = value
  }

  return buildContentFromFields(fields, values)
}
