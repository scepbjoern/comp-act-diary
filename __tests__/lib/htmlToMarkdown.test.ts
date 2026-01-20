/**
 * Tests for HTML to Markdown Converter
 */

import { describe, it, expect } from 'vitest'
import {
  htmlToMarkdown,
  truncateWithEllipsis,
  isEmptyHtmlContent,
  convertAndTruncate,
} from '@/lib/utils/htmlToMarkdown'

describe('htmlToMarkdown', () => {
  it('should convert simple HTML to Markdown', () => {
    const html = '<p>Hello <strong>World</strong></p>'
    const result = htmlToMarkdown(html)
    expect(result).toBe('Hello **World**')
  })

  it('should handle paragraphs', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>'
    const result = htmlToMarkdown(html)
    expect(result).toContain('First paragraph')
    expect(result).toContain('Second paragraph')
  })

  it('should convert lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
    const result = htmlToMarkdown(html)
    expect(result).toContain('Item 1')
    expect(result).toContain('Item 2')
    expect(result).toContain('-') // List marker present
  })

  it('should handle headings', () => {
    const html = '<h1>Heading 1</h1><h2>Heading 2</h2>'
    const result = htmlToMarkdown(html)
    expect(result).toContain('# Heading 1')
    expect(result).toContain('## Heading 2')
  })

  it('should handle links', () => {
    const html = '<a href="https://example.com">Link Text</a>'
    const result = htmlToMarkdown(html)
    expect(result).toBe('[Link Text](https://example.com)')
  })

  it('should handle italic text', () => {
    const html = '<p>This is <em>italic</em> text</p>'
    const result = htmlToMarkdown(html)
    expect(result).toBe('This is *italic* text')
  })

  it('should return empty string for null/undefined', () => {
    expect(htmlToMarkdown(null as unknown as string)).toBe('')
    expect(htmlToMarkdown(undefined as unknown as string)).toBe('')
  })

  it('should return plain text as-is if no HTML tags', () => {
    const text = 'Just plain text without any HTML'
    const result = htmlToMarkdown(text)
    expect(result).toBe(text)
  })

  it('should handle Exchange/Outlook-style HTML', () => {
    const outlookHtml = `
      <html>
        <head><meta charset="utf-8"></head>
        <body>
          <p class="MsoNormal">Meeting about <b>important</b> topics</p>
          <p class="MsoNormal">&nbsp;</p>
          <p class="MsoNormal">Location: Room 101</p>
        </body>
      </html>
    `
    const result = htmlToMarkdown(outlookHtml)
    expect(result).toContain('Meeting about **important** topics')
    expect(result).toContain('Location: Room 101')
  })

  it('should remove excessive whitespace', () => {
    const html = '<p>Text</p>\n\n\n\n<p>More text</p>'
    const result = htmlToMarkdown(html)
    expect(result).not.toContain('\n\n\n')
  })
})

describe('truncateWithEllipsis', () => {
  it('should not truncate short text', () => {
    const text = 'Short text'
    const result = truncateWithEllipsis(text, 100)
    expect(result).toBe(text)
  })

  it('should truncate long text with ellipsis', () => {
    const text = 'This is a very long text that needs to be truncated'
    const result = truncateWithEllipsis(text, 20)
    expect(result.length).toBeLessThanOrEqual(20)
    expect(result).toContain('...')
  })

  it('should break at word boundary when possible', () => {
    const text = 'Word1 Word2 Word3 Word4 Word5'
    const result = truncateWithEllipsis(text, 15)
    expect(result.length).toBeLessThanOrEqual(15)
    expect(result).toContain('...')
  })

  it('should handle empty string', () => {
    expect(truncateWithEllipsis('')).toBe('')
  })

  it('should use default max length of 5000', () => {
    const longText = 'a'.repeat(6000)
    const result = truncateWithEllipsis(longText)
    expect(result.length).toBeLessThanOrEqual(5000)
  })
})

describe('isEmptyHtmlContent', () => {
  it('should return true for empty string', () => {
    expect(isEmptyHtmlContent('')).toBe(true)
  })

  it('should return true for whitespace only', () => {
    expect(isEmptyHtmlContent('   \n\t  ')).toBe(true)
  })

  it('should return true for HTML with no text content', () => {
    expect(isEmptyHtmlContent('<p></p>')).toBe(true)
    expect(isEmptyHtmlContent('<div><span></span></div>')).toBe(true)
  })

  it('should return true for HTML with only &nbsp;', () => {
    expect(isEmptyHtmlContent('<p>&nbsp;</p>')).toBe(true)
    expect(isEmptyHtmlContent('&nbsp;&nbsp;&nbsp;')).toBe(true)
  })

  it('should return false for HTML with text content', () => {
    expect(isEmptyHtmlContent('<p>Hello</p>')).toBe(false)
    expect(isEmptyHtmlContent('Some text')).toBe(false)
  })

  it('should return true for null/undefined', () => {
    expect(isEmptyHtmlContent(null as unknown as string)).toBe(true)
    expect(isEmptyHtmlContent(undefined as unknown as string)).toBe(true)
  })
})

describe('convertAndTruncate', () => {
  it('should convert HTML and truncate if needed', () => {
    const longHtml = '<p>' + 'Word '.repeat(2000) + '</p>'
    const result = convertAndTruncate(longHtml, 100)
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result).toContain('...')
  })

  it('should return empty string for empty HTML', () => {
    expect(convertAndTruncate('')).toBe('')
    expect(convertAndTruncate('<p></p>')).toBe('')
  })

  it('should not truncate short content', () => {
    const html = '<p>Short content</p>'
    const result = convertAndTruncate(html, 1000)
    expect(result).toBe('Short content')
    expect(result).not.toContain('...')
  })
})
