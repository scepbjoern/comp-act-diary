'use client'

import { useState } from 'react'
import { TablerIcon } from '@/components/ui/TablerIcon'

interface HelpContentProps {
  summary: string
  instructions: string
  technical: string
}

type TabId = 'summary' | 'instructions' | 'technical'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'summary', label: 'Zusammenfassung', icon: 'description' },
  { id: 'instructions', label: 'Anleitung', icon: 'school' },
  { id: 'technical', label: 'Technische Details', icon: 'code' },
]

export function HelpContent({ summary, instructions, technical }: HelpContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const content = {
    summary,
    instructions,
    technical,
  }

  return (
    <div className="space-y-4">
      <div className="tabs tabs-boxed bg-base-200 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab flex items-center gap-2 ${
              activeTab === tab.id ? 'tab-active' : ''
            }`}
          >
            <TablerIcon name={tab.icon} size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div
          dangerouslySetInnerHTML={{ __html: content[activeTab] }}
          className="help-content"
        />
      </div>
    </div>
  )
}

export function HelpCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: string
  href: string
}) {
  return (
    <a
      href={href}
      className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
    >
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <TablerIcon name={icon} size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-base">{title}</h3>
            <p className="text-sm text-base-content/60 line-clamp-2">{description}</p>
          </div>
        </div>
      </div>
    </a>
  )
}

export function HelpTopicCard({
  title,
  description,
  icon,
  href,
}: {
  title: string
  description: string
  icon: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
    >
      <TablerIcon name={icon} size={20} className="text-primary flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-base-content/60 line-clamp-1">{description}</div>
      </div>
    </a>
  )
}
