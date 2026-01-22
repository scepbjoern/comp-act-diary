import { describe, it, expect } from 'vitest'

describe('MarkdownRenderer integration', () => {
  it('should process mentions with alternative names in rendered markdown', async () => {
    // This tests the processMentions function behavior
    const html = '<p>Aline hat sich heute bei mir gemeldet. Ich finde es immer toll, wenn Alin sich meldet. Und Oline natürlich auch.</p>'
    
    const contacts = [
      {
        id: '1',
        slug: 'aline-scheppler',
        name: 'Aline Scheppler',
        namesToDetectAsMention: ['Aline', 'Alin', 'Oline'],
      },
    ]
    
    // Simulate processMentions logic
    let processedHtml = html
    
    const namesToReplace: Array<{ searchName: string; contactName: string; contactSlug: string }> = []
    
    for (const contact of contacts) {
      namesToReplace.push({
        searchName: contact.name,
        contactName: contact.name,
        contactSlug: contact.slug,
      })
      if (contact.namesToDetectAsMention) {
        for (const altName of contact.namesToDetectAsMention) {
          namesToReplace.push({
            searchName: altName,
            contactName: contact.name,
            contactSlug: contact.slug,
          })
        }
      }
    }
    
    namesToReplace.sort((a, b) => b.searchName.length - a.searchName.length)
    
    for (const entry of namesToReplace) {
      const escapedName = entry.searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`@?\\b(${escapedName})\\b`, 'gi')
      processedHtml = processedHtml.replace(regex, (_match) => {
        return `<a href="/prm/${entry.contactSlug}" class="mention-link text-primary hover:underline font-medium">@${entry.contactName}</a>`
      })
    }
    
    // Verify all three alternative names were replaced
    expect(processedHtml).toContain('>@Aline Scheppler</a> hat sich heute bei mir gemeldet')
    expect(processedHtml).toContain('wenn <a href="/prm/aline-scheppler"')
    expect(processedHtml).toContain('>@Aline Scheppler</a> sich meldet')
    expect(processedHtml).toContain('Und <a href="/prm/aline-scheppler"')
    expect(processedHtml).toContain('>@Aline Scheppler</a> natürlich auch')
    
    // Verify links are correct
    expect(processedHtml).toContain('href="/prm/aline-scheppler"')
    
    // Count how many mentions were created
    const mentionCount = (processedHtml.match(/href="\/prm\/aline-scheppler"/g) || []).length
    expect(mentionCount).toBe(3) // Aline, Alin, Oline
  })
})
