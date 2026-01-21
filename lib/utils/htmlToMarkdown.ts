/**
 * HTML to Markdown Converter
 * Converts Exchange/Outlook HTML descriptions to Markdown format.
 * Uses turndown library for robust HTML parsing.
 */

import TurndownService from 'turndown'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_DESCRIPTION_LENGTH = 20000
const ELLIPSIS = '...'

// Teams meeting invitation patterns to filter out (after Markdown conversion)
const TEAMS_MEETING_PATTERNS = [
  /Microsoft Teams/i,
  /teams\.microsoft\.com/i,
  /Besprechungs-ID/i,
  /Meeting ID/i,
  /Jetzt an der Besprechung teilnehmen/i,
  /Join the meeting now/i,
  /Benötigen Sie Hilfe\?/i,
  /Need help\?/i,
]

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
 * Check if Markdown content is primarily a Teams meeting invitation.
 * These typically contain only meeting join links and IDs with no useful content.
 * Should be called AFTER HTML→Markdown conversion.
 * 
 * @param markdown - Markdown content to check
 * @returns true if content appears to be only a Teams meeting invitation
 */
export function isTeamsMeetingOnly(markdown: string): boolean {
  if (!markdown || typeof markdown !== 'string') {
    return false
  }

  const trimmed = markdown.trim()
  
  // Check if multiple Teams patterns match
  const matchCount = TEAMS_MEETING_PATTERNS.filter(pattern => pattern.test(trimmed)).length
  
  // If 2+ patterns match and content is relatively short, it's likely just a meeting invite
  // Also check if content is mostly underscores (separator lines) and links
  const underscoreRatio = (trimmed.match(/_/g) || []).length / trimmed.length
  const hasTeamsKeywords = matchCount >= 2
  const isShort = trimmed.length < 3000
  const hasManyUnderscores = underscoreRatio > 0.1
  
  if (hasTeamsKeywords && isShort && (hasManyUnderscores || matchCount >= 3)) {
    return true
  }
  
  return false
}

/**
 * Remove $$ suffix from event titles.
 * Some calendar systems add $$ as a marker suffix.
 * 
 * @param title - Event title
 * @returns Title without $$ suffix
 */
export function cleanEventTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return title
  }
  return title.replace(/\$\$$/, '').trim()
}

/**
 * Convert HTML to Markdown, filter Teams invitations, and truncate if necessary.
 * 
 * @param html - HTML string to convert
 * @param maxLength - Maximum length (default: 20000)
 * @param filterTeams - Whether to filter out Teams meeting invitations (default: true)
 * @returns Truncated Markdown string or null if filtered out
 */
export function convertAndTruncate(
  html: string,
  maxLength: number = MAX_DESCRIPTION_LENGTH,
  filterTeams: boolean = true
): string | null {
  // Convert HTML to Markdown first
  const markdown = htmlToMarkdown(html)
  
  // Check if it's a Teams meeting invitation (after conversion)
  if (filterTeams && isTeamsMeetingOnly(markdown)) {
    return null
  }
  
  // Truncate if needed
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
