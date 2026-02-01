/**
 * __tests__/lib/services/journal/contentService.test.ts
 * Unit tests for content aggregation and parsing service.
 */

import { describe, it, expect } from 'vitest'
import {
  buildContentFromFields,
  parseContentToFields,
  extractFieldValues,
  contentMatchesTemplate,
  updateFieldInContent,
  mergeFieldValues,
} from '@/lib/services/journal/contentService'
import { TemplateField } from '@/types/journal'

// =============================================================================
// TEST DATA
// =============================================================================

const reflectionFields: TemplateField[] = [
  { id: 'changed', label: 'Was hat sich verändert?', icon: '🔄', type: 'textarea', order: 0, required: true },
  { id: 'gratitude', label: 'Wofür bin ich dankbar?', icon: '🙏', type: 'textarea', order: 1, required: true },
  { id: 'vows', label: 'Meine Vorsätze', icon: '🎯', type: 'textarea', order: 2, required: false },
  { id: 'remarks', label: 'Sonstige Bemerkungen', icon: '💭', type: 'textarea', order: 3, required: false },
]

const minimalField: TemplateField[] = [
  { id: 'content', type: 'textarea', order: 0, required: false },
]

const _mixedFields: TemplateField[] = [
  { id: 'title', label: 'Titel', type: 'text', order: 0 },
  { id: 'date', label: 'Datum', type: 'date', order: 1 },
  { id: 'notes', label: 'Notizen', type: 'textarea', order: 2 },
]

// =============================================================================
// BUILD CONTENT FROM FIELDS
// =============================================================================

describe('buildContentFromFields', () => {
  it('should build content with H1 headers for labeled fields', () => {
    const values = {
      changed: 'Ich habe mehr Sport gemacht.',
      gratitude: 'Ich bin dankbar für meine Familie.',
      vows: 'Mehr lesen.',
      remarks: '',
    }

    const content = buildContentFromFields(reflectionFields, values)

    expect(content).toContain('# 🔄 Was hat sich verändert?')
    expect(content).toContain('Ich habe mehr Sport gemacht.')
    expect(content).toContain('# 🙏 Wofür bin ich dankbar?')
    expect(content).toContain('Ich bin dankbar für meine Familie.')
    expect(content).toContain('# 🎯 Meine Vorsätze')
    expect(content).toContain('Mehr lesen.')
    // Empty optional field should be skipped
    expect(content).not.toContain('Sonstige Bemerkungen')
  })

  it('should return direct content for minimal template (1 field without label)', () => {
    const values = { content: 'Heute war ein guter Tag.' }

    const content = buildContentFromFields(minimalField, values)

    expect(content).toBe('Heute war ein guter Tag.')
    expect(content).not.toContain('#')
  })

  it('should handle empty fields array', () => {
    const values = { anything: 'Some value' }

    const content = buildContentFromFields([], values)

    expect(content).toBe('Some value')
  })

  it('should respect field order', () => {
    const unorderedFields: TemplateField[] = [
      { id: 'second', label: 'Second', type: 'textarea', order: 1 },
      { id: 'first', label: 'First', type: 'textarea', order: 0 },
    ]
    const values = { first: 'First content', second: 'Second content' }

    const content = buildContentFromFields(unorderedFields, values)

    const firstIndex = content.indexOf('First')
    const secondIndex = content.indexOf('Second')
    expect(firstIndex).toBeLessThan(secondIndex)
  })

  it('should handle fields without icons', () => {
    const fieldsNoIcon: TemplateField[] = [
      { id: 'test', label: 'Test Label', type: 'textarea', order: 0 },
    ]
    const values = { test: 'Test value' }

    const content = buildContentFromFields(fieldsNoIcon, values)

    expect(content).toContain('# Test Label')
    expect(content).not.toMatch(/# \p{Emoji}/u)
  })
})

// =============================================================================
// PARSE CONTENT TO FIELDS
// =============================================================================

describe('parseContentToFields', () => {
  it('should parse content with H1 headers back to fields', () => {
    const content = `# 🔄 Was hat sich verändert?

Ich habe mehr Sport gemacht.

# 🙏 Wofür bin ich dankbar?

Ich bin dankbar für meine Familie.

# 🎯 Meine Vorsätze

Mehr lesen.`

    const result = parseContentToFields(content, reflectionFields)

    expect(result.matched).toBe(true)
    expect(result.warning).toBeUndefined()
    expect(result.fields).toHaveLength(4)

    const values = extractFieldValues(result.fields)
    expect(values.changed).toBe('Ich habe mehr Sport gemacht.')
    expect(values.gratitude).toBe('Ich bin dankbar für meine Familie.')
    expect(values.vows).toBe('Mehr lesen.')
    expect(values.remarks).toBe('')
  })

  it('should return direct content for minimal template', () => {
    const content = 'Heute war ein guter Tag.'

    const result = parseContentToFields(content, minimalField)

    expect(result.matched).toBe(true)
    expect(result.fields[0].value).toBe('Heute war ein guter Tag.')
  })

  it('should detect mismatched content', () => {
    const content = `# Completely Different Header

Some content here.`

    const result = parseContentToFields(content, reflectionFields)

    expect(result.matched).toBe(false)
    expect(result.warning).toBeDefined()
  })

  it('should handle partial matches', () => {
    const content = `# 🔄 Was hat sich verändert?

Nur dieses Feld ist ausgefüllt.`

    const result = parseContentToFields(content, reflectionFields)

    expect(result.matched).toBe(false) // Not all required fields matched
    const values = extractFieldValues(result.fields)
    expect(values.changed).toBe('Nur dieses Feld ist ausgefüllt.')
  })

  it('should handle empty fields array', () => {
    const result = parseContentToFields('Any content', [])

    expect(result.matched).toBe(true)
    expect(result.fields).toHaveLength(0)
  })

  it('should handle headers without icons', () => {
    const fieldsNoIcon: TemplateField[] = [
      { id: 'test', label: 'Test Label', type: 'textarea', order: 0 },
    ]
    const content = `# Test Label

Test content here.`

    const result = parseContentToFields(content, fieldsNoIcon)

    expect(result.matched).toBe(true)
    expect(result.fields[0].value).toBe('Test content here.')
  })

  it('should handle fuzzy label matching', () => {
    const fields: TemplateField[] = [
      { id: 'changed', label: 'Was hat sich verändert?', type: 'textarea', order: 0 },
    ]
    const content = `# Was hat sich verändert

Similar but not exact label.`

    const result = parseContentToFields(content, fields)

    // Should match due to fuzzy matching
    expect(result.matched).toBe(true)
  })
})

// =============================================================================
// CONTENT MATCHES TEMPLATE
// =============================================================================

describe('contentMatchesTemplate', () => {
  it('should return true for matching content', () => {
    const content = `# 🔄 Was hat sich verändert?

Content

# 🙏 Wofür bin ich dankbar?

More content

# 🎯 Meine Vorsätze

Vows

# 💭 Sonstige Bemerkungen

Remarks`

    expect(contentMatchesTemplate(content, reflectionFields)).toBe(true)
  })

  it('should return false for non-matching content', () => {
    const content = 'Just plain text without headers'

    expect(contentMatchesTemplate(content, reflectionFields)).toBe(false)
  })

  it('should return true for minimal template', () => {
    const content = 'Any content works for minimal template'

    expect(contentMatchesTemplate(content, minimalField)).toBe(true)
  })
})

// =============================================================================
// UPDATE FIELD IN CONTENT
// =============================================================================

describe('updateFieldInContent', () => {
  it('should update a specific field value', () => {
    const originalContent = `# 🔄 Was hat sich verändert?

Original text.

# 🙏 Wofür bin ich dankbar?

Gratitude text.`

    const updated = updateFieldInContent(
      originalContent,
      reflectionFields.slice(0, 2),
      'changed',
      'Updated text.'
    )

    expect(updated).toContain('Updated text.')
    expect(updated).not.toContain('Original text.')
    expect(updated).toContain('Gratitude text.')
  })
})

// =============================================================================
// MERGE FIELD VALUES
// =============================================================================

describe('mergeFieldValues', () => {
  it('should merge new values into existing content', () => {
    const originalContent = `# 🔄 Was hat sich verändert?

Original changed.

# 🙏 Wofür bin ich dankbar?

Original gratitude.`

    const merged = mergeFieldValues(
      originalContent,
      reflectionFields.slice(0, 2),
      { gratitude: 'Updated gratitude.' }
    )

    expect(merged).toContain('Original changed.')
    expect(merged).toContain('Updated gratitude.')
    expect(merged).not.toContain('Original gratitude.')
  })

  it('should add new field values', () => {
    const originalContent = `# 🔄 Was hat sich verändert?

Only this field.`

    const merged = mergeFieldValues(
      originalContent,
      reflectionFields.slice(0, 2),
      { gratitude: 'New gratitude.' }
    )

    expect(merged).toContain('Only this field.')
    expect(merged).toContain('New gratitude.')
  })
})

// =============================================================================
// ROUNDTRIP TESTS
// =============================================================================

describe('roundtrip (build → parse → build)', () => {
  it('should produce identical content after roundtrip', () => {
    const values = {
      changed: 'Change content with\nmultiple lines.',
      gratitude: 'Gratitude content.',
      vows: 'Vows content.',
      remarks: 'Remarks content.',
    }

    const built = buildContentFromFields(reflectionFields, values)
    const parsed = parseContentToFields(built, reflectionFields)
    const rebuilt = buildContentFromFields(reflectionFields, extractFieldValues(parsed.fields))

    expect(parsed.matched).toBe(true)
    expect(rebuilt).toBe(built)
  })

  it('should handle minimal template roundtrip', () => {
    const values = { content: 'Simple diary entry.\n\nWith paragraphs.' }

    const built = buildContentFromFields(minimalField, values)
    const parsed = parseContentToFields(built, minimalField)
    const rebuilt = buildContentFromFields(minimalField, extractFieldValues(parsed.fields))

    expect(parsed.matched).toBe(true)
    expect(rebuilt).toBe(built)
  })
})
