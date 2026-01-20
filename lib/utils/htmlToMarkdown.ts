/**
 * HTML to Markdown Converter
 * Converts Exchange/Outlook HTML descriptions to Markdown format.
 * Uses turndown library for robust HTML parsing.
 */

import TurndownService from 'turndown'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_DESCRIPTION_LENGTH = 5000
const ELLIPSIS = '...'

// =============================================================================
// TURNDOWN CONFIGURATION
// =============================================================================

/**
 * Create and configure Turndown service instance.
 */
function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  })

  // Remove script and style tags completely
  turndownService.remove(['script', 'style', 'head', 'meta', 'link'])

  // Handle empty links (common in Outlook HTML)
  turndownService.addRule('emptyLinks', {
    filter: (node) => {
      return node.nodeName === 'A' && !node.textContent?.trim()
    },
    replacement: () => '',
  })

  // Handle Outlook-specific spans with no content
  turndownService.addRule('emptySpans', {
    filter: (node) => {
      return node.nodeName === 'SPAN' && !node.textContent?.trim()
    },
    replacement: () => '',
  })

  return turndownService
}

// Singleton instance
let turndownInstance: TurndownService | null = null

function getTurndownService(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService()
  }
  return turndownInstance
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Convert HTML to Markdown.
 * Handles Exchange/Outlook HTML format and sanitizes output.
 * 
 * @param html - HTML string to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // If input doesn't look like HTML, return as-is (already plain text)
  if (!html.includes('<') && !html.includes('&')) {
    return html.trim()
  }

  try {
    const turndown = getTurndownService()
    let markdown = turndown.turndown(html)

    // Clean up excessive whitespace
    markdown = markdown
      // Replace multiple newlines with max 2
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing whitespace from lines
      .replace(/[ \t]+$/gm, '')
      // Remove leading/trailing whitespace
      .trim()

    return markdown
  } catch (error) {
    // If turndown fails, try basic HTML stripping
    console.warn('htmlToMarkdown: Turndown failed, using basic strip', error)
    return stripHtmlTags(html)
  }
}

/**
 * Truncate text with ellipsis if it exceeds maxLength.
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 5000)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateWithEllipsis(
  text: string,
  maxLength: number = MAX_DESCRIPTION_LENGTH
): string {
  if (!text || text.length <= maxLength) {
    return text
  }

  // Try to break at a word boundary
  const truncateAt = maxLength - ELLIPSIS.length
  let truncated = text.substring(0, truncateAt)

  // Find last space to avoid breaking words
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > truncateAt * 0.8) {
    truncated = truncated.substring(0, lastSpace)
  }

  return truncated + ELLIPSIS
}

/**
 * Check if HTML content is effectively empty.
 * Returns true for empty strings, whitespace-only, or HTML with no text content.
 * 
 * @param html - HTML string to check
 * @returns true if content is empty
 */
export function isEmptyHtmlContent(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true
  }

  // Strip HTML tags and check if anything remains
  const stripped = stripHtmlTags(html)
  return stripped.trim().length === 0
}

/**
 * Convert HTML to Markdown and truncate if necessary.
 * Convenience function combining htmlToMarkdown and truncateWithEllipsis.
 * 
 * @param html - HTML string to convert
 * @param maxLength - Maximum length (default: 5000)
 * @returns Truncated Markdown string
 */
export function convertAndTruncate(
  html: string,
  maxLength: number = MAX_DESCRIPTION_LENGTH
): string {
  if (isEmptyHtmlContent(html)) {
    return ''
  }

  const markdown = htmlToMarkdown(html)
  return truncateWithEllipsis(markdown, maxLength)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Basic HTML tag stripping (fallback for turndown failures).
 */
function stripHtmlTags(html: string): string {
  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&szlig;/gi, 'ß')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()
}
