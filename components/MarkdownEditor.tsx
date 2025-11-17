'use client'

import { forwardRef } from 'react'
import dynamic from 'next/dynamic'
import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

// Dynamic import to avoid SSR issues
const MDXEditor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => mod.MDXEditor),
  { ssr: false }
)

interface MarkdownEditorWrapperProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
  readOnly?: boolean
}

export const MarkdownEditor = forwardRef<MDXEditorMethods, MarkdownEditorWrapperProps>(
  ({ markdown, onChange, placeholder, readOnly }, ref) => {
    return (
      <div className="prose prose-invert max-w-none">
        <MDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          contentEditableClassName="prose prose-invert"
        />
      </div>
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'

