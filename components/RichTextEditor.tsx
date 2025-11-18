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
      const [popupPos, setPopupPos] = React.useState({ top: 0, left: 0 })
      const insertDirective = usePublisher(insertDirective$)
      const menuRef = React.useRef<HTMLDivElement>(null)
      const buttonRef = React.useRef<HTMLButtonElement>(null)
      
      const handleToggleMenu = () => {
        if (!showMenu && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          setPopupPos({
            top: rect.bottom + 4,
            left: rect.left
          })
        }
        setShowMenu(!showMenu)
      }
      
      React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setShowMenu(false)
          }
        }
        if (showMenu) {
          document.addEventListener('mousedown', handleClickOutside)
          return () => document.removeEventListener('mousedown', handleClickOutside)
        }
      }, [showMenu])
      
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
            attributes: { title },
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    value: ''
                  }
                ]
              }
            ]
          } as any)
        }
        setShowMenu(false)
      }

      return (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
          <button
            ref={buttonRef}
            type="button"
            onClick={handleToggleMenu}
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
                position: 'fixed',
                top: `${popupPos.top}px`,
                left: `${popupPos.left}px`,
                background: 'rgb(100, 116, 139)',
                border: '1px solid rgb(148, 163, 184)',
                borderRadius: '4px',
                padding: '8px',
                zIndex: 99999,
                minWidth: '150px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
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
      Editor: ({ mdastNode, children, parentEditor }: any) => {
        return (
          <details style={{ padding: '10px', border: '1px solid #64748b', borderRadius: '4px', backgroundColor: 'rgb(30, 41, 59)' }}>
            <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
              {mdastNode.attributes?.title || 'Spoiler'}
            </summary>
            <div style={{ marginTop: '8px' }}>
              {children}
            </div>
          </details>
        )
      }
    }

    const FullscreenButton = ({ onClick }: { onClick: () => void }) => {
      return (
        <button
          type="button"
          onClick={onClick}
          title="Vollbild"
          style={{
            padding: '4px 8px',
            background: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ⛶
        </button>
      )
    }

    const EditorComponent = forwardRef<MDXEditorMethods, {
      markdown: string
      onChange: (markdown: string) => void
      placeholder?: string
      readOnly?: boolean
      time?: string
      onFullscreen?: () => void
    }>(({ markdown, onChange, placeholder, readOnly, time, onFullscreen }, ref) => {
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
                  {onFullscreen && (
                    <>
                      <Separator />
                      <FullscreenButton onClick={onFullscreen} />
                    </>
                  )}
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
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    const toggleFullscreen = () => {
      setIsFullscreen(prev => !prev)
    }

    React.useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isFullscreen) {
          setIsFullscreen(false)
        }
      }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }, [isFullscreen])

    return (
      <div 
        className={`border border-slate-700 rounded bg-background overflow-auto resize-y ${
          isFullscreen 
            ? 'fixed inset-0 z-[10000] m-0 rounded-none min-h-screen max-h-screen' 
            : 'min-h-[300px] max-h-[70vh]'
        }`}
      >
        <Editor {...props} ref={ref} onFullscreen={toggleFullscreen} />
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="fixed top-4 right-4 z-[10001] bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded shadow-lg"
            title="Fullscreen beenden (ESC)"
          >
            ✕ Schließen
          </button>
        )}
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

