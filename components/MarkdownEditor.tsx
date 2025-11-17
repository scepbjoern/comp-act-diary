'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'
import '@mdxeditor/editor/style.css'

// Dynamic import to avoid SSR issues with MDXEditor
const MDXEditor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => mod.MDXEditor),
  { ssr: false }
)

const {
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
  diffSourcePlugin,
  frontmatterPlugin,
  toolbarPlugin,
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
  ChangeCodeMirrorLanguage,
  ConditionalContents,
  DiffSourceToggleWrapper
} = await import('@mdxeditor/editor')

interface MarkdownEditorProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
  readOnly?: boolean
}

export const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ markdown, onChange, placeholder, readOnly }, ref) => {
    return (
      <div ref={ref} className="mdx-editor-wrapper">
        <MDXEditor
          markdown={markdown}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin(),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', ts: 'TypeScript', py: 'Python', html: 'HTML', css: 'CSS' } }),
            diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: '' }),
            frontmatterPlugin(),
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
                  <ConditionalContents
                    options={[
                      { when: () => true, contents: () => <InsertCodeBlock /> }
                    ]}
                  />
                  <ConditionalContents
                    options={[
                      { when: () => true, contents: () => <ChangeCodeMirrorLanguage /> }
                    ]}
                  />
                  <Separator />
                  <DiffSourceToggleWrapper>
                    <ConditionalContents
                      options={[
                        { when: () => true, contents: () => <></>}
                      ]}
                    />
                  </DiffSourceToggleWrapper>
                </>
              )
            })
          ]}
        />
      </div>
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'
