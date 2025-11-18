'use client'

import React, { forwardRef } from 'react'
import dynamic from 'next/dynamic'
import type { MDXEditorMethods } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Dynamically import all MDX Editor components to avoid SSR issues
const Editor = dynamic(
  async () => {
    const {
      MDXEditor,
      headingsPlugin,
      listsPlugin,
      quotePlugin,
      thematicBreakPlugin,
      markdownShortcutPlugin,
      linkPlugin,
      linkDialogPlugin,
      imagePlugin,
      tablePlugin,
      codeBlockPlugin,
      codeMirrorPlugin,
      toolbarPlugin,
      directivesPlugin,
      AdmonitionDirectiveDescriptor,
      UndoRedo,
      BoldItalicUnderlineToggles,
      BlockTypeSelect,
      CreateLink,
      InsertImage,
      InsertTable,
      InsertThematicBreak,
      ListsToggle,
      Separator,
      InsertCodeBlock,
      InsertAdmonition,
      Select,
      usePublisher,
      insertDirective$,
    } = await import('@mdxeditor/editor')

    // Custom insert directive component
    const InsertDirective = () => {
      const [showMenu, setShowMenu] = React.useState(false)
      const insertDirective = usePublisher(insertDirective$)
      
      const insertYouTube = () => {
        const id = prompt('YouTube Video ID eingeben:')
        if (id) {
          insertDirective({
            name: 'youtube',
            type: 'leafDirective',
            attributes: { id }
          })
        }
        setShowMenu(false)
      }

      const insertTOC = () => {
        insertDirective({
          name: 'toc',
          type: 'leafDirective',
          attributes: {}
        })
        setShowMenu(false)
      }

      const insertSpoiler = () => {
        const title = prompt('Spoiler-Titel eingeben:', 'Spoiler')
        if (title !== null) {
          insertDirective({
            name: 'spoiler',
            type: 'containerDirective',
            attributes: { title }
          })
        }
        setShowMenu(false)
      }

      return (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            style={{
              padding: '4px 8px',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Direktiven ▼
          </button>
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: 'rgb(71, 85, 105)',
                border: '1px solid rgb(100, 116, 139)',
                borderRadius: '4px',
                padding: '4px',
                zIndex: 1000,
                minWidth: '150px'
              }}
            >
              <button
                type="button"
                onClick={insertSpoiler}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Spoiler
              </button>
              <button
                type="button"
                onClick={insertTOC}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                TOC
              </button>
              <button
                type="button"
                onClick={insertYouTube}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                YouTube
              </button>
            </div>
          )}
        </div>
      )
    }

    // Custom directive descriptors
    const YouTubeDirectiveDescriptor = {
      name: 'youtube',
      testNode(node: any) {
        return node.name === 'youtube'
      },
      attributes: ['id'],
      hasChildren: false,
      Editor: ({ mdastNode, lexicalNode, parentEditor }: any) => {
        return (
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <p>YouTube Video: {mdastNode.attributes?.id || 'No ID'}</p>
            <iframe
              width="100%"
              height="315"
              src={`https://www.youtube.com/embed/${mdastNode.attributes?.id}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        )
      }
    }

    const TOCDirectiveDescriptor = {
      name: 'toc',
      testNode(node: any) {
        return node.name === 'toc'
      },
      attributes: [],
      hasChildren: false,
      Editor: () => {
        return (
          <div style={{ padding: '10px', border: '1px solid #64748b', borderRadius: '4px', backgroundColor: 'rgb(30, 41, 59)' }}>
            <p style={{ margin: 0, color: '#94a3b8' }}>📑 Table of Contents (wird beim Rendering generiert)</p>
          </div>
        )
      }
    }

    const SpoilerDirectiveDescriptor = {
      name: 'spoiler',
      testNode(node: any) {
        return node.name === 'spoiler'
      },
      attributes: ['title'],
      hasChildren: true,
      Editor: ({ mdastNode, lexicalNode, parentEditor }: any) => {
        return (
          <details style={{ padding: '10px', border: '1px solid #64748b', borderRadius: '4px', backgroundColor: 'rgb(30, 41, 59)' }}>
            <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
              {mdastNode.attributes?.title || 'Spoiler'}
            </summary>
            <div style={{ marginTop: '8px' }}>
              {lexicalNode.getChildren()}
            </div>
          </details>
        )
      }
    }

    const EditorComponent = forwardRef<MDXEditorMethods, {
      markdown: string
      onChange: (markdown: string) => void
      placeholder?: string
      readOnly?: boolean
      time?: string
    }>(({ markdown, onChange, placeholder, readOnly, time }, ref) => {
      return (
        <MDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          contentEditableClassName="prose prose-invert max-w-none text-sm"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin({
              imageUploadHandler: async (file: File) => {
                // Upload image and return URL
                const formData = new FormData()
                formData.append('file', file)
                if (time) {
                  formData.append('time', time)
                }
                
                const response = await fetch('/api/upload-image', {
                  method: 'POST',
                  body: formData,
                })
                
                if (!response.ok) {
                  throw new Error('Upload failed')
                }
                
                const data = await response.json()
                return data.url
              }
            }),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({
              codeBlockLanguages: {
                js: 'JavaScript',
                ts: 'TypeScript',
                py: 'Python',
                html: 'HTML',
                css: 'CSS',
                bash: 'Bash',
                json: 'JSON'
              }
            }),
            directivesPlugin({
              directiveDescriptors: [
                YouTubeDirectiveDescriptor,
                TOCDirectiveDescriptor,
                SpoilerDirectiveDescriptor,
                AdmonitionDirectiveDescriptor
              ]
            }),
            markdownShortcutPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <InsertTable />
                  <InsertThematicBreak />
                  <Separator />
                  <InsertCodeBlock />
                  <Separator />
                  <InsertAdmonition />
                  <Separator />
                  <InsertDirective />
                </>
              )
            })
          ]}
        />
      )
    })

    EditorComponent.displayName = 'EditorComponent'
    return { default: EditorComponent }
  },
  { ssr: false }
)

interface RichTextEditorProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
  readOnly?: boolean
  time?: string // HH:MM time for image uploads
}

export const RichTextEditor = forwardRef<MDXEditorMethods, RichTextEditorProps>(
  (props, ref) => {
    return (
      <div className="border border-slate-700 rounded bg-background min-h-[300px] max-h-[70vh] overflow-auto resize-y">
        <Editor {...props} ref={ref} />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

