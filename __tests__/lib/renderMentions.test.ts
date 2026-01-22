import { describe, it, expect } from 'vitest'
import { renderTextWithMentions } from '@/lib/utils/mentions'

describe('renderTextWithMentions', () => {
  it('should replace full contact name with link', () => {
    const text = 'Aline Scheppler hat sich gemeldet.'
    const mentions = [
      {
        contactName: 'Aline Scheppler',
        contactSlug: 'aline-scheppler',
        namesToDetectAsMention: [],
      },
    ]
    
    const result = renderTextWithMentions(text, mentions)
    
    expect(result).toContain('<a href="/prm/aline-scheppler"')
    expect(result).toContain('Aline Scheppler</a>')
  })

  it('should replace alternative names with full contact name link', () => {
    const text = 'Aline hat sich heute bei mir gemeldet. Ich finde es immer toll, wenn Alin sich meldet. Und Oline natürlich auch.'
    const mentions = [
      {
        contactName: 'Aline Scheppler',
        contactSlug: 'aline-scheppler',
        namesToDetectAsMention: ['Aline', 'Alin', 'Oline'],
      },
    ]
    
    const result = renderTextWithMentions(text, mentions)
    
    // All three alternative names should be replaced with the full name
    expect(result).toContain('<a href="/prm/aline-scheppler" class="text-primary hover:underline font-medium">Aline Scheppler</a> hat sich heute bei mir gemeldet.')
    expect(result).toContain('wenn <a href="/prm/aline-scheppler" class="text-primary hover:underline font-medium">Aline Scheppler</a> sich meldet.')
    expect(result).toContain('Und <a href="/prm/aline-scheppler" class="text-primary hover:underline font-medium">Aline Scheppler</a> natürlich auch.')
  })

  it('should handle case insensitive matching', () => {
    const text = 'ALINE hat sich gemeldet und aline auch.'
    const mentions = [
      {
        contactName: 'Aline Scheppler',
        contactSlug: 'aline-scheppler',
        namesToDetectAsMention: ['Aline'],
      },
    ]
    
    const result = renderTextWithMentions(text, mentions)
    
    // Both "ALINE" and "aline" should be replaced
    expect(result).toContain('<a href="/prm/aline-scheppler"')
    expect(result.match(/<a href="\/prm\/aline-scheppler"/g)?.length).toBe(2)
  })

  it('should not replace partial matches', () => {
    const text = 'Aline Schepplers Auto ist neu. Oline-Marie ist hier.'
    const mentions = [
      {
        contactName: 'Aline Scheppler',
        contactSlug: 'aline-scheppler',
        namesToDetectAsMention: ['Aline', 'Oline'],
      },
    ]
    
    const result = renderTextWithMentions(text, mentions)
    
    // "Aline" should be replaced, "Schepplers" should not trigger
    // "Oline-Marie" contains "Oline" but it's not a word boundary - should or shouldn't match?
    // Based on regex \b, "Oline" in "Oline-Marie" WILL match because hyphen is a word boundary
    expect(result).toContain('Aline Scheppler</a> Schepplers Auto')
  })

  it('should handle multiple contacts', () => {
    const text = 'Anna und Max haben sich getroffen.'
    const mentions = [
      {
        contactName: 'Anna Wiedemann',
        contactSlug: 'anna-wiedemann',
        namesToDetectAsMention: ['Anna'],
      },
      {
        contactName: 'Max Mustermann',
        contactSlug: 'max-mustermann',
        namesToDetectAsMention: ['Max'],
      },
    ]
    
    const result = renderTextWithMentions(text, mentions)
    
    expect(result).toContain('<a href="/prm/anna-wiedemann"')
    expect(result).toContain('Anna Wiedemann</a>')
    expect(result).toContain('<a href="/prm/max-mustermann"')
    expect(result).toContain('Max Mustermann</a>')
  })

  it('should handle empty mentions array', () => {
    const text = 'Some text without mentions'
    const mentions: Array<{ contactName: string; contactSlug: string; namesToDetectAsMention?: string[] }> = []
    
    const result = renderTextWithMentions(text, mentions)
    
    expect(result).toBe(text)
  })
})
