import { Icon } from '@/components/ui/Icon'
import { NumberPills } from '@/components/features/symptoms/NumberPills'
import { Sparkline } from '@/components/features/analytics/Sparkline'
import { DEFAULT_STOOL_ICON } from '@/lib/default-icons'
import type { Day, InlineData } from '@/types/day'

interface StoolSectionProps {
  day: Day
  inlineData: InlineData | null
  onUpdateStool: (bristol: number) => void
}

export function StoolSection({ day, inlineData, onUpdateStool }: StoolSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">
        <span className="inline-flex items-center gap-1">
          <Icon name={DEFAULT_STOOL_ICON} />
          <span>Stuhl (Bristol 1–7)</span>
          {inlineData?.stool && (
            <span className="inline-flex items-center gap-2 ml-2">
              <Sparkline 
                data={inlineData.stool} 
                width={72} 
                height={24} 
                yMin={1} 
                yMax={7} 
                colorByValue 
                midValue={4} 
                scheme="stool" 
              />
            </span>
          )}
        </span>
      </h3>
      <div className="text-xs text-gray-400">
        {' '}
        <a
          href="/docs/Darmkur-Guide_Auszug.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400 hover:text-blue-300"
        >
          Darmkur‑Guide (Auszug)
        </a>
        .
      </div>
      <NumberPills
        min={1}
        max={7}
        value={day.stool}
        onChange={onUpdateStool}
        ariaLabel="Bristol"
        previousValue={typeof inlineData?.yesterday?.stool === 'number' ? inlineData.yesterday.stool : null}
        includeDashFirst
        dashValue={99}
      />
    </div>
  )
}
