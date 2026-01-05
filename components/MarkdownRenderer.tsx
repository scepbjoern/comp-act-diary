'use client'

import { useEffect, useState } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'

interface MentionContact {
  id: string
  slug: string
  name: string
  namesToDetectAsMention?: string[]
}

interface MarkdownRendererProps {
  markdown: string
  className?: string
  mentionedContacts?: MentionContact[]
}

// Plugin to handle custom directives
function remarkCustomDirectives() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        const data = node.data || (node.data = {})
        const hast = data.hName || node.name

        // YouTube directive
        if (hast === 'youtube') {
          const id = node.attributes?.id
          data.hName = 'div'
          data.hProperties = {
            className: 'youtube-embed my-4',
          }
          node.children = [
            {
              type: 'html',
              value: `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            }
          ]
        }

        // TOC directive
        if (hast === 'toc') {
          data.hName = 'div'
          data.hProperties = {
            className: 'toc-placeholder p-4 border border-slate-700 rounded bg-slate-800/50 my-4',
          }
          node.children = [
            {
              type: 'html',
              value: '<p class="text-gray-400">📑 Table of Contents</p>'
            }
          ]
        }

        // Spoiler directive
        if (hast === 'spoiler') {
          const title = node.attributes?.title || 'Spoiler'
          data.hName = 'details'
          data.hProperties = {
            className: 'spoiler border border-slate-700 rounded p-4 my-4 bg-slate-800/50',
          }
          // Insert summary as first child
          node.children.unshift({
            type: 'html',
            value: `<summary class="cursor-pointer text-gray-400 hover:text-gray-300 font-medium">${title}</summary>`
          })
        }

        // Admonition directives (note, tip, info, caution, danger)
        const admonitionTypes = ['note', 'tip', 'info', 'caution', 'danger']
        if (admonitionTypes.includes(hast)) {
          const title = node.attributes?.title || hast.charAt(0).toUpperCase() + hast.slice(1)
          const colors = {
            note: 'border-blue-500 bg-blue-500/10',
            tip: 'border-green-500 bg-green-500/10',
            info: 'border-cyan-500 bg-cyan-500/10',
            caution: 'border-yellow-500 bg-yellow-500/10',
            danger: 'border-red-500 bg-red-500/10',
          }
          const icons = {
            note: '📝',
            tip: '💡',
            info: 'ℹ️',
            caution: '⚠️',
            danger: '🚫',
          }
          data.hName = 'div'
          data.hProperties = {
            className: `admonition ${colors[hast as keyof typeof colors]} border-l-4 rounded p-4 my-4`,
          }
          node.children.unshift({
            type: 'html',
            value: `<div class="font-bold text-sm mb-2">${icons[hast as keyof typeof icons]} ${title}</div>`
          })
        }
      }
    })
  }
}

// Convert @mentions to clickable links
function processMentions(html: string, contacts: MentionContact[]): string {
  if (!contacts || contacts.length === 0) return html
  
  let processedHtml = html
  
  // Build list of all names to replace: full name + alternative names
  const namesToReplace: Array<{ searchName: string; contactName: string; contactSlug: string }> = []
  
  for (const contact of contacts) {
    // Add full name
    namesToReplace.push({
      searchName: contact.name,
      contactName: contact.name,
      contactSlug: contact.slug,
    })
    // Add alternative names
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
  
  // Sort by searchName length descending to avoid partial replacements
  namesToReplace.sort((a, b) => b.searchName.length - a.searchName.length)
  
  for (const entry of namesToReplace) {
    // Escape special regex characters in name
    const escapedName = entry.searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match @Name or just the name (case-insensitive)
    const regex = new RegExp(`@?\\b(${escapedName})\\b`, 'gi')
    processedHtml = processedHtml.replace(regex, (_match) => {
      return `<a href="/prm/${entry.contactSlug}" class="mention-link text-primary hover:underline font-medium">@${entry.contactName}</a>`
    })
  }
  
  return processedHtml
}

export function MarkdownRenderer({ markdown, className = '', mentionedContacts = [] }: MarkdownRendererProps) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    async function renderMarkdown() {
      try {
        const file = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkDirective)
          .use(remarkCustomDirectives)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeRaw)
          .use(rehypeStringify)
          .process(markdown || '')
        
        let renderedHtml = String(file)
        
        // Process mentions if contacts are provided
        if (mentionedContacts.length > 0) {
          renderedHtml = processMentions(renderedHtml, mentionedContacts)
        }
        
        setHtml(renderedHtml)
      } catch (error) {
        console.error('Markdown rendering error:', error)
        setHtml('<p>Error rendering markdown</p>')
      }
    }
    renderMarkdown()
  }, [markdown, mentionedContacts])

  return (
    <div 
      className={`prose prose-invert prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
