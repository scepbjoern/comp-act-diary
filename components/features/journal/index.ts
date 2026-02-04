/**
 * components/features/journal/index.ts
 * Central export for journal-related components.
 */

export { EmojiPickerButton } from './EmojiPickerButton'
export { FieldRenderer } from './FieldRenderer'
export { DynamicJournalForm } from './DynamicJournalForm'
export { TemplateFieldEditor } from './TemplateFieldEditor'
export { TemplateAIConfigEditor } from './TemplateAIConfigEditor'
export { TemplateEditor } from './TemplateEditor'

// New unified components (Phase 3)
export { JournalEntryCard } from './JournalEntryCard'
export type { CardMode, JournalEntryCardProps } from './JournalEntryCard'
export { UnifiedEntryForm } from './UnifiedEntryForm'
export type { UnifiedEntryFormProps, FormData as EntryFormData } from './UnifiedEntryForm'
