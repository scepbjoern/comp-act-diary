/**
 * Input sanitization utilities.
 * Grosszügige Konfiguration für vertrauenswürdige Nutzer.
 */

import DOMPurify from 'isomorphic-dompurify'

// Erlaubte HTML-Tags für Rich-Text-Inhalte (grosszügig)
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'figure', 'figcaption',
  'div', 'span', 'hr',
]

// Erlaubte Attribute
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id',
  'target', 'rel', 'width', 'height',
  'data-mention', 'data-contact-id', 'data-contact-slug',
]

/**
 * Sanitize HTML content for rich text fields.
 * Allows common formatting tags and safe attributes.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true, // Allow data-* attributes for mentions etc.
  })
}

/**
 * Sanitize plain text - strips all HTML tags.
 * Use for titles, names, and other plain text fields.
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] })
}

/**
 * Sanitize and limit string length.
 * Use for user input that should have a maximum length.
 */
export function sanitizeWithLimit(dirty: string, maxLength: number): string {
  const clean = sanitizeText(dirty)
  return clean.slice(0, maxLength)
}

/**
 * Basic XSS protection for markdown content.
 * Removes script tags and event handlers but preserves markdown syntax.
 */
export function sanitizeMarkdown(dirty: string): string {
  if (!dirty) return ''
  // Remove script tags
  let clean = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')
  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, '')
  return clean
}
