'use client'

import Link from 'next/link'
import { TablerIcon } from '@/components/ui/TablerIcon'

interface HelpLinkProps {
  category: string
  topic?: string
  label?: string
  className?: string
}

export function HelpLink({ category, topic, label, className = '' }: HelpLinkProps) {
  const href = topic ? `/help/${category}/${topic}` : `/help/${category}`

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-sm text-primary hover:underline ${className}`}
      title="Hilfe anzeigen"
    >
      <TablerIcon name="help" size={14} />
      {label && <span>{label}</span>}
    </Link>
  )
}

interface HelpButtonProps {
  category: string
  topic?: string
  label?: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function HelpButton({ category, topic, label = 'Hilfe', size = 'sm', className = '' }: HelpButtonProps) {
  const href = topic ? `/help/${category}/${topic}` : `/help/${category}`

  return (
    <Link
      href={href}
      className={`btn btn-ghost btn-${size} ${className}`}
      title="Hilfe anzeigen"
    >
      <TablerIcon name="help" size={size === 'xs' ? 14 : size === 'sm' ? 16 : 18} />
      {label}
    </Link>
  )
}
